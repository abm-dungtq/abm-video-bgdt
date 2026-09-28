// spoken.mjs — how a display token is read aloud, and which tokens the voice cannot read on its own.
//
// Digits stay digits on screen (karaoke, labels, counters) and are spoken as Vietnamese words:
//   10 → mười, 2026 → hai nghìn không trăm hai mươi sáu, 64.000 → sáu mươi tư nghìn, 7.75 → bảy chấm bảy mươi lăm.
// Foreign words (Lark, Base, Kanban, AI…) are read unpredictably by the Vietnamese voice, so each needs a
// `spokenOverrides` entry (a Vietnamese reading, or the word itself to keep it as is).

const DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

/** Vietnamese words for an integer 0 ≤ n < 10^12. */
export function readInt(n) {
  if (n < 10) return DIGITS[n];
  if (n < 100) {
    const t = Math.floor(n / 10), u = n % 10;
    const head = t === 1 ? "mười" : `${DIGITS[t]} mươi`;
    if (!u) return head;
    const tail = u === 1 && t > 1 ? "mốt" : u === 5 ? "lăm" : u === 4 && t > 1 ? "tư" : DIGITS[u];
    return `${head} ${tail}`;
  }
  if (n < 1000) {
    const h = Math.floor(n / 100), r = n % 100;
    return `${DIGITS[h]} trăm` + (!r ? "" : r < 10 ? ` linh ${DIGITS[r]}` : ` ${readInt(r)}`);
  }
  for (const [scale, word] of [[1e9, "tỷ"], [1e6, "triệu"], [1e3, "nghìn"]]) {
    if (n >= scale) {
      const q = Math.floor(n / scale), r = n % scale;
      return `${readInt(q)} ${word}` + (!r ? "" : r < 10 ? ` không trăm linh ${DIGITS[r]}` : r < 100 ? ` không trăm ${readInt(r)}` : ` ${readInt(r)}`);
    }
  }
  return String(n);
}

/** Spoken words for a bare numeric token ("10", "64.000", "7.75", "3,5"), or null when it is not one. */
export function readNumeric(bare) {
  if (/^\d{1,3}(\.\d{3})+$/.test(bare)) return readInt(Number(bare.replace(/\./g, "")));
  if (/^\d+$/.test(bare)) return bare.length > 12 ? null : readInt(Number(bare));
  const m = bare.match(/^(\d+)[.,](\d+)$/);
  if (m) return `${readInt(Number(m[1]))} ${bare.includes(",") ? "phẩy" : "chấm"} ${readInt(Number(m[2]))}`;
  return null;
}

// a Vietnamese syllable: optional onset, a vowel nucleus, optional coda (tones and hats removed first)
const SYLLABLE = /^(ngh|ng|nh|ch|gh|gi|kh|ph|qu|th|tr|b|c|d|đ|g|h|k|l|m|n|p|r|s|t|v|x)?(uyê|uya|uyu|oeo|oao|oai|oay|uây|uôi|ươi|ươu|iêu|yêu|oa|oe|oă|uâ|uê|uy|uô|ươ|iê|yê|ai|ao|au|ay|âu|ây|eo|êu|ia|iu|oi|ôi|ơi|ua|ui|ưa|ưi|ưu|a|ă|â|e|ê|i|o|ô|ơ|u|ư|y)(ch|ng|nh|c|m|n|p|t)?$/;
const plain = (w) => w.normalize("NFD").replace(/[̣̀́̃̉]/g, "").normalize("NFC").toLowerCase();

/** True when the voice can be trusted with this word as written: a Vietnamese syllable, not an acronym. */
export function isVietnamese(bare) {
  if (!/\p{L}/u.test(bare)) return true;
  if (/^\p{Lu}{2,}$/u.test(bare)) return false; // AI, CRM: letters, not a word
  return bare.split("-").every((p) => SYLLABLE.test(plain(p)));
}
