// Version history shown on the title screen. One entry per shipped update, newest first; the
// first entry's version is the game's current version (shown in the top-right corner).
// Numbering counts updates since the first playable build: v1.0, v1.1, ... — bump the last
// number for every update you ship and add its notes here.

export interface Release {
  version: string;
  date: string;
  th: string;
  en: string;
}

export const CHANGELOG: Release[] = [
  {
    version: "1.25",
    date: "2026-10-30",
    th: "🏮 ตัวละครลับปรากฏตัวแล้ว! บางคืน ถ้าหัวใจยังไม่ยอมแพ้ คุณอาจเห็นใครบางคนที่คนอื่นมองไม่เห็น พร้อมตอนจบลับระดับตำนาน ปลดล็อกตัวเลือกที่เคยต้องมีอาชีพเดิม (เล่นดนตรี สอนหนังสือ และอื่นๆ ใครก็ทำได้แล้ว) และแก้กรอบหัวกระดานคะแนน",
    en: "🏮 A secret character has arrived! On some nights, if your heart hasn't given up, you may see someone nobody else can — with a hidden legendary ending. Choices that needed a past profession are open to everyone (busking, teaching and more), and the leaderboard header frame is fixed.",
  },
  {
    version: "1.24",
    date: "2026-10-30",
    th: "สถิติรายวัน: ใครรอดนานสุดในแต่ละวัน เริ่มนับใหม่ทุกเที่ยงคืน ดูย้อนหลังได้ 7 วัน กระดานคะแนนแบ่งเป็นแท็บด้านบน ไม่ต้องเลื่อนยาว สถานที่ใหม่เมืองละ 1 แห่งพร้อมฉากของตัวเอง ตัวละครที่จะเจอซ้ำ 3 คน (เด็กข้างถนน ยายขายดอกไม้ อดีตตำรวจ) ตอนจบใหม่ 2 แบบ เหตุการณ์ใหม่กว่า 30 อัน และปรับหน้าจอให้พอดีทุกขนาด",
    en: "Daily stats: the longest survivor of each day, reset every midnight, with the last 7 days to browse. The leaderboard is now split into tabs at the top. A new real place in every city with its own scene, 3 recurring characters (a street kid, an old flower seller, an ex-policeman), 2 new endings, 30+ new events, and layouts checked to fit every screen size.",
  },
  {
    version: "1.23",
    date: "2026-10-28",
    th: "ประวัติชีวิตบนกระดานคะแนน กดที่ผู้รอดชีวิตหรือชีวิตไหนก็ได้ เพื่อดูว่ารอดกี่วัน เหลือเงินเท่าไหร่ จบเกมที่สถานที่ไหน ฉากจบเป็นอย่างไร จบเพราะอะไร และไทม์ไลน์ทั้งชีวิต ผู้รอดชีวิตอันดับ 1 เปิดให้ดูเลย",
    en: "Life stories on the leaderboard: tap any survivor or life to see days survived, money left, the exact place it ended, the ending scene, why it ended, and the whole timeline. The top survivor's story is open by default.",
  },
  {
    version: "1.22",
    date: "2026-10-28",
    th: "หอเกียรติยศผู้รอดชีวิตในหน้ากระดานคะแนน จัดอันดับผู้เล่นที่รอดพ้นจากถนนได้จริง ตามจำนวนวันที่รอด พร้อมเหรียญเกียรติยศ ทองแดง เงิน ทอง และเพชร",
    en: "Survivors' Hall of Honour on the leaderboard: players who truly got off the street, ranked by days survived, with bronze, silver, gold and diamond medals.",
  },
  {
    version: "1.21",
    date: "2026-10-28",
    th: "ทางชีวิตใหม่ 9 แบบ (แบกของในตลาด ต่อคิว วาดชอล์ก ตกปลา ห้องสมุด เขียนบันทึก ช่วยโรงทาน เฝ้าร้าน นั่งสงบใจ) แต่ละทางมีเรื่องราวต่อเนื่องและตอนจบของตัวเอง ตอนจบใหม่ 8 แบบ ฉากใหม่ในเมืองอีกกว่า 30 เหตุการณ์ และแถบเวอร์ชันนี้",
    en: "9 new ways to live (market porter, queueing for hire, chalk art, fishing, the library, a notebook, the soup kitchen, night watch, quiet worship), each with its own story arc and ending. 8 new endings, 30+ new city scenes, and this version bar.",
  },
  { version: "1.20", date: "2026-10-28", th: "ชื่อที่ต่างกันแค่ตัวพิมพ์เล็ก-ใหญ่นับเป็นผู้เล่นคนเดียวกัน", en: "Names that differ only in upper/lower case count as one player." },
  { version: "1.19", date: "2026-10-28", th: "ต้องใส่ชื่อก่อนเล่นต่อชีวิตที่บันทึกไว้ด้วย", en: "A name is required to continue a saved life too." },
  { version: "1.18", date: "2026-10-28", th: "บันทึกชื่อผู้เล่นทุกครั้งที่เกิดใหม่ และรายชื่อผู้เล่นทั้งหมดพร้อมจำนวนรอบที่เกิด", en: "Your name is recorded at every rebirth; a list of all players with how many times each was reborn." },
  { version: "1.17", date: "2026-10-28", th: "กระดานคะแนนรวมเป็นหน้าเดียว เห็นทุกชีวิต เรียงตามคะแนน วันที่รอด หรือเงินตอนจบ", en: "One leaderboard page with every life, sortable by score, days survived or money at the end." },
  { version: "1.16", date: "2026-10-28", th: "ใส่ชื่อในหน้าแรกก่อนสุ่มเกิด", en: "Enter your name on the title screen before rolling a life." },
  { version: "1.15", date: "2026-10-28", th: "กระดานคะแนนวันนี้ และชื่อเดียวขึ้นแค่แถวเดียว", en: "A today board, and each name shown once with its best run." },
  { version: "1.14", date: "2026-10-28", th: "แบบฟอร์มแจ้งปัญหาและเสนอไอเดียในเกม", en: "In-game form for bug reports and ideas." },
  { version: "1.13", date: "2026-10-28", th: "หน้าตั้งค่า ความเร็วข้อความ และการเคลื่อนไหว", en: "Settings page: text speed and motion." },
  { version: "1.12", date: "2026-10-28", th: "เหตุการณ์ประจำสถานที่จริงในทั้ง 15 เมือง", en: "A local event at a real spot in each of the 15 cities." },
  { version: "1.11", date: "2026-10-28", th: "ปุ่มลัดคีย์บอร์ด และหน้าต่างวิธีเล่น", en: "Keyboard shortcuts and a how-to-play window." },
  { version: "1.10", date: "2026-10-28", th: "ร่องรอยที่ผู้เล่นคนอื่นทิ้งไว้ในแต่ละจุดของเมือง", en: "Traces other players leave at each spot in the city." },
  { version: "1.9", date: "2026-10-28", th: "คำแนะนำสำหรับผู้เล่นใหม่บนหน้าจอเล่น", en: "First-time tips on the play screen." },
  { version: "1.8", date: "2026-10-28", th: "หน้าประวัติชีวิตที่ผ่านมา", en: "A past-lives history page." },
  { version: "1.7", date: "2026-10-28", th: "ติดตั้งเป็นแอปและเล่นออฟไลน์ได้", en: "Installable as an app, playable offline." },
  { version: "1.6", date: "2026-10-28", th: "ความสำเร็จ สถิติรวม และธีมโปสเตอร์ที่ปลดล็อกได้", en: "Achievements, career stats and unlockable poster themes." },
  { version: "1.5", date: "2026-10-28", th: "โจทย์ประจำวัน อัลบั้มตอนจบ และโปสเตอร์ผู้รอดชีวิต", en: "Daily challenge, endings album and survivor poster." },
  { version: "1.4", date: "2026-10-28", th: "ทางเลือกที่ถึงตาย และตอนจบแบบจากไป", en: "Fatal choices and death endings." },
  { version: "1.3", date: "2026-10-28", th: "ระบบออนไลน์ โปรไฟล์ และโจทย์ประจำวัน", en: "Online features, profiles and the daily challenge." },
  { version: "1.2", date: "2026-10-28", th: "ปรับคะแนนให้การหลุดพ้นจากถนนคุ้มกว่าการอยู่นาน", en: "Scoring rebalanced so escaping beats farming days." },
  { version: "1.1", date: "2026-10-28", th: "สถิติการเล่น และกระดานคะแนนที่ตรวจสอบโดยเซิร์ฟเวอร์", en: "Play stats and a server-verified leaderboard." },
  { version: "1.0", date: "2026-10-28", th: "เวอร์ชันแรก เกมจำลองชีวิตข้างถนนใน 15 เมือง", en: "First version: a street-life simulator in 15 cities." },
];

export const VERSION = CHANGELOG[0].version;
