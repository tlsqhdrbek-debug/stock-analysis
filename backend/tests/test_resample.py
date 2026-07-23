from src.data.resample import resample_minutes


def m(date, time, o, h, l, c, v=100):
    return {"date": date, "time": time, "open": o, "high": h, "low": l, "close": c, "volume": v}


class TestResample:
    def test_240_two_bars_per_day(self):
        # 09:30, 12:59 → 첫 봉 / 13:00, 15:30 → 둘째 봉
        mins = [
            m("20260722", "093000", 100, 110, 95, 105),
            m("20260722", "125900", 105, 120, 100, 115),
            m("20260722", "130000", 115, 118, 110, 112),
            m("20260722", "153000", 112, 125, 111, 120),
        ]
        out = resample_minutes(mins, 240)
        assert len(out) == 2
        assert out[0]["time"] == "090000"
        assert out[0]["open"] == 100 and out[0]["close"] == 115
        assert out[0]["high"] == 120 and out[0]["low"] == 95
        assert out[1]["time"] == "130000"
        assert out[1]["close"] == 120

    def test_60_bucket_boundaries(self):
        mins = [
            m("20260722", "090000", 1, 1, 1, 1),
            m("20260722", "095900", 2, 2, 2, 2),
            m("20260722", "100000", 3, 3, 3, 3),
        ]
        out = resample_minutes(mins, 60)
        assert len(out) == 2
        assert out[0]["close"] == 2  # 09:00~09:59
        assert out[1]["open"] == 3   # 10:00~

    def test_volume_sum_and_day_isolation(self):
        mins = [
            m("20260721", "093000", 1, 1, 1, 1, v=10),
            m("20260722", "093000", 2, 2, 2, 2, v=20),
        ]
        out = resample_minutes(mins, 240)
        assert len(out) == 2
        assert out[0]["volume"] == 10 and out[1]["volume"] == 20
