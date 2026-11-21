import json
from pathlib import Path

import pytest

from jamster import db
from jamster.curation.__main__ import main
from jamster.models import Artist, Track


def library(path: Path) -> None:
    conn = db.connect(path)
    for player, numbers in (("ann", range(0, 40)), ("ben", range(20, 60))):
        db.upsert_player(conn, player, player.title(), "rt")
        db.sync_sources(conn, player, [db.Listed("liked", "liked", "Liked songs", 40, "v1")], "now")
        tracks = [
            Track(f"t{n}", f"spotify:track:t{n}", f"Song {n}", (Artist(f"a{n % 7}", f"A{n % 7}"),),
                  "", None, str(1960 + n), f"ISRC{n}", 200_000)
            for n in numbers
        ]  # fmt: skip
        source = db.list_sources(conn, player)[0]
        db.store_copy(
            conn, player, source, tracks, {"saved": dict.fromkeys((t.id for t in tracks), 1)}
        )
    conn.close()


@pytest.mark.parametrize("strategy", ["balanced", "show_and_tell", "wildcards"])
def test_the_command_writes_a_markdown_report_and_json_lines_and_prints_where(
    tmp_path: Path, capsys: pytest.CaptureFixture[str], strategy: str
):
    path = tmp_path / "jamster.db"
    library(path)
    out = tmp_path / "runs" / "try"
    main([strategy, "--db", str(path), "--size", "20", "--set", "weights.saved=0.5",
          "--report", "familiarity", "--out", str(out)])  # fmt: skip

    md, jsonl = (Path(line) for line in capsys.readouterr().out.splitlines())
    assert (md, jsonl) == (tmp_path / "runs" / "try.md", tmp_path / "runs" / "try.jsonl")
    text = md.read_text()
    assert "## Deck" in text and "## Summary" in text and "## Familiarity" in text
    assert "`weights.saved` = 0.5" in text and "| Ann |" in text
    deck, *songs = [json.loads(line) for line in jsonl.read_text().splitlines()]
    assert deck["type"] == "deck" and deck["parameters"]["weights.saved"] == 0.5
    assert len(songs) == 20 and all(s["strategy"] == strategy for s in songs)
    assert all(s["knowers"] or s["reason"] == "classic" for s in songs)


def test_without_out_the_files_go_to_data_curation(
    tmp_path: Path, capsys: pytest.CaptureFixture[str], monkeypatch: pytest.MonkeyPatch
):
    library(tmp_path / "jamster.db")
    monkeypatch.chdir(tmp_path)
    main(["wildcards", "--db", "jamster.db", "--size", "10", "--seed", "4"])

    printed = [Path(line) for line in capsys.readouterr().out.splitlines()]
    assert [p.suffix for p in printed] == [".md", ".jsonl"]
    assert all(p.parent == Path("data/curation") and p.exists() for p in printed)
    assert printed[0].stem.endswith("-wildcards-seed4")


def test_the_command_can_split_one_library_into_made_up_players(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
):
    path = tmp_path / "jamster.db"
    library(path)
    out = tmp_path / "split"
    main(["--db", str(path), "--players", "Ann", "--split", "3", "--size", "12", "--out", str(out)])
    capsys.readouterr()
    text = (tmp_path / "split.md").read_text()
    assert "The players are made up" in text and "| Ann/3 |" in text
