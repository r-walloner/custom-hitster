from jamster.spotify import _profile_image  # pyright: ignore[reportPrivateUsage]


def test_profile_image_is_the_smallest_sharp_one():
    big, small = {"url": "big", "width": 300}, {"url": "small", "width": 64}
    assert _profile_image([big, small]) == "big"
    assert _profile_image([small, {"url": "huge", "width": 640}, big]) == "big"


def test_profile_image_falls_back_to_the_largest_or_the_first():
    assert _profile_image([{"url": "a", "width": 32}, {"url": "b", "width": 64}]) == "b"
    assert _profile_image([{"url": "a", "width": None}, {"url": "b"}]) == "a"
    assert _profile_image([]) is None
