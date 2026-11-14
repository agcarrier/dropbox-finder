// Parses USPS collection_times ("Mo-Fr 16:00; Sa 12:00", times may be comma-separated)
// and finds the next pickup after `now`.
// ponytail: uses the device clock and timezone, ignores holidays; fine for a box near you.
const DI = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6 };
export const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function week(t) {
  const w = [[], [], [], [], [], [], []];
  for (const part of (t || "").split(/;\s*/)) {
    const m = part.match(/^(\w\w)(?:-(\w\w))? (\d\d:\d\d(?:,\d\d:\d\d)*)$/);
    if (!m || !(m[1] in DI) || (m[2] && !(m[2] in DI))) continue;
    const mins = m[3].split(",").map(s => +s.slice(0, 2) * 60 + +s.slice(3));
    for (let d = DI[m[1]], end = m[2] ? DI[m[2]] : d; ; d = (d + 1) % 7) {
      w[d].push(...mins);
      if (d === end) break;
    }
  }
  return w.map(a => a.sort((x, y) => x - y));
}

// -> { inDays, day, min } or null when the box lists no times
export function nextPickup(t, now = new Date()) {
  const w = week(t), cur = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < 8; i++) {
    const day = (now.getDay() + i) % 7;
    const min = w[day].find(x => i > 0 || x > cur);
    if (min !== undefined) return { inDays: i, day, min };
  }
  return null;
}

export const clock = min => {
  const h = Math.floor(min / 60), m = min % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

// "Mo-Fr 16:30; Sa 10:30" -> "Mon–Fri 4:30 PM, Sat 10:30 AM"
const NAME = { Mo: "Mon", Tu: "Tue", We: "Wed", Th: "Thu", Fr: "Fri", Sa: "Sat", Su: "Sun" };
export const schedule = t => t
  ? t.replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su)\b/g, d => NAME[d]).replace(/(\w{3})-(\w{3})/g, "$1–$2")
      .replace(/(\d\d):(\d\d)/g, (_, h, m) => clock(+h * 60 + +m)).replace(/,(?=\d)/g, " & ").replace(/;\s*/g, ", ")
  : "Pickup times not listed";
