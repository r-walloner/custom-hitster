from jamster import db
from jamster.deck import Entry, cached_first
from jamster.models import Track


def entry(track_id: str) -> Entry:
    return Entry(
        Track(track_id, f"spotify:track:{track_id}", track_id, (), "", None, None, None), ()
    )


def test_the_opening_deal_prefers_songs_whose_year_is_cached():
    conn = db.connect(":memory:")
    for track_id in ("c", "e", "f"):
        db.put_year(conn, track_id, 1990, "musicbrainz")
    entries = [entry(t) for t in "abcdef"]

    order = [e.track.id for e in cached_first(conn, entries, 2)]

    assert order == ["c", "e", "a", "b", "d", "f"]  # only two move; the rest keep their order


def test_without_a_cache_the_order_stays():
    conn = db.connect(":memory:")
    entries = [entry(t) for t in "abc"]
    assert cached_first(conn, entries, 3) == entries
