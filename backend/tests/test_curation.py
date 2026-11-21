import random
from collections.abc import Iterable, Mapping

from jamster.curation import (
    DEFAULT,
    STRATEGIES,
    Balanced,
    Classic,
    Pool,
    ShowAndTell,
    TasteProfile,
    Weights,
    Wildcards,
)
from jamster.curation.songs import (
    Knowledge,
    Selection,
    artist_depth,
    familiarity,
    fill,
    merge,
    normalize,
    year_quotas,
)
from jamster.messages import RoomSettings
from jamster.models import Artist, Signal, Track

SAVED = (Signal("saved", 1),)


def track(
    id: str,
    *,
    name: str | None = None,
    artist: str = "a1",
    year: int = 2000,
    isrc: str | None = None,
) -> Track:
    return Track(
        id, f"spotify:track:{id}", name or id, (Artist(artist, artist.upper()),), "", None,
        str(year), isrc, 200_000,
    )  # fmt: skip


def profile(
    player: str,
    tracks: Mapping[str, tuple[Signal, ...]] | Iterable[str],
    artists: Mapping[str, tuple[Signal, ...]] | None = None,
) -> TasteProfile:
    signals = dict(tracks) if isinstance(tracks, Mapping) else dict.fromkeys(tracks, SAVED)
    return TasteProfile(player, player.title(), signals, artists or {})


def pool(
    profiles: list[TasteProfile],
    tracks: Iterable[Track],
    years: Mapping[str, int] | None = None,
    classics: Iterable[Classic] = (),
) -> Pool:
    classics = list(classics)
    catalog = {t.id: t for t in tracks} | {c.track.id: c.track for c in classics}
    return Pool(profiles, catalog, years or {}, classics, this_year=2026)


# --- songs -----------------------------------------------------------------------------------


def test_normalize_drops_release_tags_and_keeps_other_versions():
    assert normalize("Bohemian Rhapsody - Remastered 2011") == "bohemian rhapsody"
    assert normalize("Heroes (2017 Remaster)") == "heroes"
    assert normalize("Smooth (feat. Rob Thomas)") == "smooth"
    assert normalize("Song - Radio Edit") == "song"
    assert normalize("Song - Seismal D Remix") == "song seismal d remix"
    assert normalize("Song - Live at Wembley") == "song live at wembley"
    assert normalize("Sweet Dreams (Are Made of This)") == "sweet dreams are made of this"


def test_merging_joins_releases_of_one_song_but_not_other_versions():
    tracks = [
        track("orig", name="Song", year=1975),
        track("remaster", name="Song - Remastered 2011", year=2011),
        track("isrc1", name="Other", year=1990, isrc="X1"),
        track("isrc2", name="Other (Single)", year=1989, isrc="x1"),
        track("remix", name="Song - Club Remix", year=1999),
        track("cover", name="Song", artist="a2", year=2003),
        track("future", year=2031),
    ]
    songs = {s.track.id: s for s in merge(pool([], tracks))}

    assert set(songs) == {"orig", "isrc2", "remix", "cover"}
    assert songs["orig"].track_ids == ("orig", "remaster") and songs["orig"].year == 1975
    assert songs["isrc2"].year == 1989, "the earliest year of a merged song"


def test_a_cached_year_beats_spotifys_and_a_listed_year_beats_both():
    tracks = [track("a", year=2010), track("b", name="a", year=2005), track("c", year=2001)]
    classic = Classic(track("list", name="c", year=2012), 1971)
    songs = {s.track.id: s for s in merge(pool([], tracks, {"a": 1984}, [classic]))}

    assert (songs["a"].year, songs["a"].year_source) == (1984, "cached")
    assert (songs["list"].year, songs["list"].year_source, songs["list"].classic) == (
        1971,
        "list",
        True,
    )


# --- familiarity -----------------------------------------------------------------------------


def test_familiarity_grows_with_evidence_and_stays_below_one():
    tracks = [track(f"t{n}") for n in range(6)] + [track("theirs", artist="a2")]
    signals = {
        "t0": SAVED,
        "t1": (*SAVED, Signal("playlist", 3)),
        "t2": (*SAVED, Signal("playlist", 3), Signal("top_long", 1), Signal("top_medium", 1)),
        **{f"t{n}": SAVED for n in range(3, 6)},
    }
    ann = profile("ann", signals, {"a2": (Signal("top_long", 1),)})
    songs = {s.track.id: s for s in merge(pool([ann], tracks))}
    depth = artist_depth(ann, list(songs.values()))
    w = Weights()

    scores = [familiarity(ann, songs[f"t{n}"], depth, w)[0] for n in range(3)]
    assert 0 < scores[0] < scores[1] < scores[2] < 1
    through_artist, evidence = familiarity(ann, songs["theirs"], depth, w)
    assert 0 < through_artist < scores[0] and evidence == ("top artist (long #1)",)
    stranger = profile("cy", {})
    assert familiarity(stranger, songs["t0"], artist_depth(stranger, []), w) == (0.0, ())


# --- years -----------------------------------------------------------------------------------


def test_year_quotas_follow_the_power_and_never_exceed_what_a_span_has():
    years = [1960] * 4 + [1990] * 16 + [2020] * 64
    rng = random.Random(0)
    assert year_quotas(years, 21, 1, 10, rng) == {1960: 1, 1990: 4, 2020: 16}
    assert year_quotas(years, 14, 0.5, 10, rng) == {1960: 2, 1990: 4, 2020: 8}
    assert year_quotas(years, 30, 0, 10, rng) == {1960: 4, 1990: 13, 2020: 13}
    assert sum(year_quotas(years, 200, 0.5, 10, rng).values()) == 84


# --- filling ---------------------------------------------------------------------------------


def test_every_library_gets_an_equal_share_whatever_its_size():
    big = [track(f"big{n}", artist=f"b{n}", year=1950 + n % 70) for n in range(1000)]
    small = [track(f"small{n}", artist=f"s{n}", year=1950 + n % 70) for n in range(50)]
    p = pool(
        [profile("ann", [t.id for t in big]), profile("ben", [t.id for t in small])], big + small
    )
    for strategy in STRATEGIES.values():
        picked = strategy.curate(p, 40, random.Random(1))
        owners = [c.why.owner for c in picked]
        assert (owners.count("Ann"), owners.count("Ben")) == (20, 20), strategy.key


def test_the_artist_cap_holds_while_other_artists_are_left():
    tracks = [track(f"same{n}", artist="star") for n in range(10)]
    tracks += [track(f"other{n}", artist=f"x{n}") for n in range(10)]
    p = pool([profile("ann", [t.id for t in tracks])], tracks)
    k = Knowledge.of(p, Weights())
    selection = Selection("test", k, {2000: 20}, 5, artist_cap=2)
    ranking = sorted(range(len(k.songs)), key=lambda i: not k.songs[i].track.id.startswith("same"))
    fill(selection, [(0, [(i, 1.0) for i in ranking])], 10, "core")

    picked = [c.track_id for c in selection.picked]
    assert sum(t.startswith("same") for t in picked) == 2 and len(picked) == 10


# --- strategies ------------------------------------------------------------------------------


def classics(n: int, decade: int) -> list[Classic]:
    return [
        Classic(
            track(f"c{decade}-{i}", artist=f"c{decade}-{i}", year=decade + i % 10), decade + i % 10
        )
        for i in range(n)
    ]


def test_balanced_mixes_in_classics_where_the_libraries_leave_decades_thin():
    recent = [track(f"new{n}", artist=f"n{n}", year=2020 + n % 6) for n in range(200)]
    p = pool(
        [profile("ann", [t.id for t in recent])],
        recent,
        classics=classics(20, 1960) + classics(20, 1980) + classics(20, 2020),
    )
    picked = Balanced().curate(p, 50, random.Random(3))

    classic = [c for c in picked if c.why.reason == "classic"]
    assert len(classic) == 5 and len(picked) == 50
    assert all(c.why.year < 2000 for c in classic), "the 2020s are full already"
    assert all(c.known_by == () and c.why.year_source == "list" for c in classic)


def test_balanced_tops_up_with_classics_when_the_libraries_run_short():
    mine = [track(f"t{n}", artist=f"a{n}", year=1990 + n) for n in range(5)]
    p = pool([profile("ann", [t.id for t in mine])], mine, classics=classics(30, 1970))
    picked = Balanced().curate(p, 20, random.Random(0))
    assert [c.why.reason for c in picked].count("classic") == 15


def test_balanced_prefers_songs_more_players_know_and_keeps_a_few_wildcards():
    shared = [track(f"shared{n}", artist=f"s{n}", year=1970 + n) for n in range(30)]
    anns = [track(f"ann{n}", artist=f"a{n}", year=1970 + n) for n in range(30)]
    favourite = {t.id: (*SAVED, Signal("top_long", 1 + n)) for n, t in enumerate(anns)}
    p = pool(
        [
            profile("ann", {**dict.fromkeys((t.id for t in shared), SAVED), **favourite}),
            profile("ben", [t.id for t in shared]),
        ],
        shared + anns,
    )
    picked = Balanced(classics_share=0, wildcard_share=0.2).curate(p, 20, random.Random(0))

    core = [c for c in picked if c.why.reason == "core"]
    wild = [c for c in picked if c.why.reason == "wildcard"]
    assert len(core) == 16 and all(c.track_id.startswith("shared") for c in core)
    assert len(wild) == 4 and all(c.known_by == ("ann",) for c in wild)


def test_show_and_tell_brings_each_players_own_songs_rather_than_shared_ones():
    tracks = [track("shared", artist="s"), track("hers", artist="h"), track("his", artist="b")]
    p = pool([profile("ann", ["shared", "hers"]), profile("ben", ["shared", "his"])], tracks)
    picked = ShowAndTell().curate(p, 2, random.Random(0))

    assert {(c.track_id, c.why.owner) for c in picked} == {("hers", "Ann"), ("his", "Ben")}


def test_wildcards_digs_out_the_song_its_owner_barely_knows():
    tracks = [track("hit", artist="h"), track("deep", artist="d"), track("shared", artist="s")]
    ann = profile(
        "ann",
        {
            "hit": (*SAVED, Signal("top_long", 1), Signal("playlist", 4)),
            "deep": (Signal("playlist", 1),),
            "shared": SAVED,
        },
    )
    p = pool([ann, profile("ben", ["shared"])], tracks)
    picked = Wildcards(jitter=0).curate(p, 1, random.Random(0))
    assert [c.track_id for c in picked] == ["deep"]


def test_every_pick_explains_itself():
    tracks = [track(f"t{n}", artist=f"a{n}", year=1980 + n) for n in range(10)]
    p = pool(
        [profile("ann", [t.id for t in tracks[:6]]), profile("ben", [t.id for t in tracks[4:]])],
        tracks,
    )
    for strategy in STRATEGIES.values():
        picked = strategy.curate(p, 6, random.Random(0))
        assert [c.why.pick for c in picked] == list(range(1, len(picked) + 1))
        for c in picked:
            assert c.why.strategy == strategy.key and c.why.knowers
            assert c.why.owner in ("Ann", "Ben") and c.known_by[0] == c.why.owner.lower()
            line = c.why.short()
            assert line.startswith(f"{strategy.key} {c.why.reason}, score ")
            assert c.why.knowers[0].name in line and "saved" in line


def test_the_same_seed_picks_the_same_deck_and_another_seed_another():
    tracks = [track(f"t{n}", artist=f"a{n % 40}", year=1960 + n % 60) for n in range(300)]
    p = pool([profile("ann", [t.id for t in tracks])], tracks)
    for strategy in STRATEGIES.values():
        once = [c.track_id for c in strategy.curate(p, 30, random.Random(7))]
        again = [c.track_id for c in strategy.curate(p, 30, random.Random(7))]
        other = [c.track_id for c in strategy.curate(p, 30, random.Random(8))]
        assert once == again and once != other, strategy.key


def test_the_strategies_are_registered_in_lobby_order_with_balanced_first():
    assert list(STRATEGIES) == ["balanced", "show_and_tell", "wildcards"]
    assert DEFAULT == RoomSettings().strategy == "balanced"
    assert [s.name for s in STRATEGIES.values()] == ["Balanced", "Show & Tell", "Wildcards"]
