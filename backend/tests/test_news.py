from datetime import datetime, timedelta, timezone

from src.data.news import clean_title, parse_pubdate, select_recent, source_from_url

KST = timezone(timedelta(hours=9))
NOW = datetime(2026, 7, 22, 15, 0, tzinfo=KST)


def rfc822(dt: datetime) -> str:
    return dt.strftime("%a, %d %b %Y %H:%M:%S %z")


def item(title="제목", days_ago=1, link="https://www.yna.co.kr/view/x", desc=""):
    return {
        "title": title,
        "description": desc,
        "originallink": link,
        "link": "https://news.naver.com/x",
        "pubDate": rfc822(NOW - timedelta(days=days_ago)),
    }


class TestCleanTitle:
    def test_strips_bold_tags(self):
        assert clean_title("<b>삼성전자</b> 신고가") == "삼성전자 신고가"

    def test_unescapes_entities(self):
        assert clean_title("&quot;HBM&quot; 공급 &amp; 수요") == '"HBM" 공급 & 수요'


class TestSource:
    def test_known_domain(self):
        assert source_from_url("https://www.yna.co.kr/view/AKR123") == "연합뉴스"
        assert source_from_url("https://www.hankyung.com/article/1") == "한국경제"

    def test_unknown_domain_returns_host(self):
        assert source_from_url("https://example.com/a") == "example.com"


class TestSelectRecent:
    def test_filters_old_news(self):
        items = [item(days_ago=1), item(days_ago=10)]
        out = select_recent(items, now=NOW)
        assert len(out) == 1

    def test_limit(self):
        items = [item(days_ago=1) for _ in range(20)]
        out = select_recent(items, now=NOW, limit=10)
        assert len(out) == 10

    def test_neutral_tag_phase1(self):
        out = select_recent([item()], now=NOW)
        assert out[0]["tag"] == "NEUTRAL"
        assert out[0]["summary"] is None

    def test_invalid_pubdate_skipped(self):
        bad = item()
        bad["pubDate"] = "not-a-date"
        assert select_recent([bad], now=NOW) == []

    def test_prefers_originallink(self):
        out = select_recent([item(link="https://www.mk.co.kr/1")], now=NOW)
        assert out[0]["url"] == "https://www.mk.co.kr/1"
        assert out[0]["source"] == "매일경제"


class TestRequireFilter:
    def test_drops_unrelated(self):
        items = [
            item(title="<b>삼성전자</b> 신고가 경신"),
            item(title="요리경연 참가자 모집"),  # 오탐
        ]
        out = select_recent(items, now=NOW, require="삼성전자")
        assert len(out) == 1
        assert "삼성전자" in out[0]["title"]

    def test_matches_description_too(self):
        items = [item(title="반도체 대장주 급등", desc="삼성전자가 5% 올랐다")]
        out = select_recent(items, now=NOW, require="삼성전자")
        assert len(out) == 1

    def test_space_and_case_insensitive(self):
        items = [item(title="naver, 실적 발표")]
        out = select_recent(items, now=NOW, require="NAVER")
        assert len(out) == 1

    def test_fallback_when_all_filtered(self):
        items = [item(title="무관한 기사 A"), item(title="무관한 기사 B")]
        out = select_recent(items, now=NOW, require="삼성전자")
        assert len(out) == 2  # 전부 걸러지면 필터 없이 폴백
