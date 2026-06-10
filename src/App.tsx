import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Fuel, Heart, RotateCcw, Trophy } from "lucide-react";
import { Motorbike3D } from "./Motorbike3D";

const PRICE_PER_LITER = 16250; // Pertamax, Rp/liter
const MAX_LIVES = 3;
const HIGHSCORE_KEY = "spbu-highscore";

const MONEY_ORDERS = [10000, 15000, 20000, 25000, 30000, 35000, 40000, 50000];
const LITER_ORDERS = [1, 1.5, 2, 2.5, 3];
const CUSTOMERS = ["🧕", "👨", "👩", "🧑‍🦱", "👴", "👷", "🧑‍💼", "👮"];

type Order = {
  customer: string;
  text: string;
  targetMoney: number;
  targetLiters: number;
};

type Phase = "ready" | "filling" | "result" | "gameover";

type Verdict = {
  points: number;
  title: string;
  detail: string;
  emoji: string;
  loseLife: boolean;
};

function formatRupiah(n: number) {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

function randomOrder(): Order {
  const customer = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
  if (Math.random() < 0.5) {
    const money = MONEY_ORDERS[Math.floor(Math.random() * MONEY_ORDERS.length)];
    return {
      customer,
      text: `Pertamax ${formatRupiah(money)} ya, Kak!`,
      targetMoney: money,
      targetLiters: money / PRICE_PER_LITER,
    };
  }
  const liters = LITER_ORDERS[Math.floor(Math.random() * LITER_ORDERS.length)];
  return {
    customer,
    text: `Pertamax ${liters.toLocaleString("id-ID")} liter ya, Kak!`,
    targetMoney: liters * PRICE_PER_LITER,
    targetLiters: liters,
  };
}

function judge(money: number, target: number): Verdict {
  const diff = money - target;
  if (diff > 100) {
    return {
      points: 0,
      title: "Kelebihan!",
      detail: `Kamu nombok ${formatRupiah(diff)}. Pelanggan cuma bayar sesuai pesanan.`,
      emoji: "😱",
      loseLife: true,
    };
  }
  const short = Math.abs(diff);
  if (short <= 100)
    return {
      points: 100,
      title: "Pas banget!",
      detail: "Presisi level master SPBU.",
      emoji: "🤩",
      loseLife: false,
    };
  if (short <= 300)
    return {
      points: 70,
      title: "Mantap!",
      detail: `Cuma kurang ${formatRupiah(short)}.`,
      emoji: "😄",
      loseLife: false,
    };
  if (short <= 600)
    return {
      points: 40,
      title: "Lumayan",
      detail: `Kurang ${formatRupiah(short)} dari pesanan.`,
      emoji: "🙂",
      loseLife: false,
    };
  if (short <= 1500)
    return {
      points: 15,
      title: "Hampir...",
      detail: `Kurang ${formatRupiah(short)}. Pelanggan agak cemberut.`,
      emoji: "😕",
      loseLife: false,
    };
  return {
    points: 0,
    title: "Kurang banyak!",
    detail: `Kurang ${formatRupiah(short)}. Pelanggan komplain ke pusat.`,
    emoji: "😤",
    loseLife: true,
  };
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={"bg-paper rounded-xl shadow-[var(--shadow-xs)] " + className}>{children}</div>
  );
}

export default function App() {
  const [order, setOrder] = useState<Order>(() => randomOrder());
  const [phase, setPhase] = useState<Phase>("ready");
  const [liters, setLiters] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [round, setRound] = useState(1);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [highscore, setHighscore] = useState(0);
  const [holding, setHolding] = useState(false);

  const holdingRef = useRef(false);
  const litersRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const holdStartRef = useRef(0);
  const lastTickRef = useRef(0);

  useEffect(() => {
    setHighscore(Number(localStorage.getItem(HIGHSCORE_KEY) ?? 0));
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const money = Math.round(liters * PRICE_PER_LITER);
  // Tangki digambar dengan target di 75% supaya garis batas selalu terlihat
  const tankCapacity = order.targetLiters / 0.75;
  const fillFrac = Math.min(1, liters / tankCapacity);

  const tick = useCallback((now: number) => {
    const dt = (now - lastTickRef.current) / 1000;
    lastTickRef.current = now;
    if (holdingRef.current) {
      const heldFor = (now - holdStartRef.current) / 1000;
      // Mulai pelan lalu makin deras — tap singkat untuk isi sedikit-sedikit
      const rate = Math.min(0.6, 0.18 + heldFor * 0.55); // liter/detik
      litersRef.current += rate * dt;
      setLiters(litersRef.current);
      rafRef.current = requestAnimationFrame(tick);
    } else {
      rafRef.current = null;
    }
  }, []);

  const startFilling = useCallback(() => {
    if (holdingRef.current) return;
    // Nozzle 3D bisa diklik kapan saja — hanya boleh mengisi saat ronde berjalan
    if (phase !== "ready" && phase !== "filling") return;
    holdingRef.current = true;
    setHolding(true);
    setPhase("filling");
    holdStartRef.current = performance.now();
    lastTickRef.current = performance.now();
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(tick);
  }, [tick, phase]);

  const stopFilling = useCallback(() => {
    holdingRef.current = false;
    setHolding(false);
  }, []);

  const handDelivery = () => {
    stopFilling();
    const v = judge(Math.round(litersRef.current * PRICE_PER_LITER), order.targetMoney);
    const newScore = score + v.points;
    const newLives = lives - (v.loseLife ? 1 : 0);
    setScore(newScore);
    setLives(newLives);
    setVerdict(v);
    if (newLives <= 0) {
      setPhase("gameover");
      if (newScore > highscore) {
        setHighscore(newScore);
        localStorage.setItem(HIGHSCORE_KEY, String(newScore));
      }
    } else {
      setPhase("result");
    }
  };

  const nextCustomer = () => {
    litersRef.current = 0;
    setLiters(0);
    setVerdict(null);
    setOrder(randomOrder());
    setRound((r) => r + 1);
    setPhase("ready");
  };

  const restart = () => {
    litersRef.current = 0;
    setLiters(0);
    setVerdict(null);
    setScore(0);
    setLives(MAX_LIVES);
    setRound(1);
    setOrder(randomOrder());
    setPhase("ready");
  };

  return (
    <div className="min-h-screen px-4 md:px-8 pb-12 max-w-[1100px] mx-auto">
      <div className="py-6 space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[18px] font-semibold text-ink-900 tracking-[-0.18px]">
              ⛽ Pom Bensin
            </h1>
            <p className="text-[13px] text-ink-500 mt-0.5">
              Isi Pertamax sesuai pesanan pelanggan — {formatRupiah(PRICE_PER_LITER)}/liter
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-700">
              <Trophy className="h-4 w-4 text-accent" strokeWidth={1.5} />
              {highscore}
            </span>
            <span className="flex gap-0.5">
              {Array.from({ length: MAX_LIVES }).map((_, i) => (
                <Heart
                  key={i}
                  className={"h-4 w-4 " + (i < lives ? "text-red fill-current" : "text-ink-150")}
                  strokeWidth={1.5}
                />
              ))}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
          <Card className="p-5 flex flex-col items-center gap-4">
            {/* Pesanan pelanggan */}
            <div className="flex items-start gap-3 self-start">
              <div className="h-10 w-10 rounded-full bg-ink-40 flex items-center justify-center text-[22px]">
                {order.customer}
              </div>
              <div className="relative rounded-xl bg-accent-100 px-4 py-2.5 text-[14px] font-medium text-ink-900">
                {phase === "gameover" ? "Yah, shift kamu selesai..." : `"${order.text}"`}
                <span className="absolute -left-1.5 top-3.5 h-3 w-3 rotate-45 bg-accent-100" />
              </div>
            </div>

            <div className="w-full max-w-[560px]">
              <Motorbike3D
                fillFrac={fillFrac}
                targetFrac={0.75}
                filling={holding && phase === "filling"}
                departing={phase === "result" || phase === "gameover"}
                bikeKey={round}
                onFillStart={startFilling}
                onFillStop={stopFilling}
              />
              <p className="mt-1.5 text-center text-[11px] text-ink-400">
                Arahkan nozzle ke tangki lalu tahan klik untuk mengisi · geser area kosong untuk
                memutar kamera · garis merah = batas pesanan
              </p>
            </div>

            {/* Kontrol */}
            {phase === "gameover" ? (
              <div className="text-center space-y-3">
                <div className="text-[32px]">💔</div>
                <div className="text-[15px] font-semibold text-ink-900">Game Over</div>
                <div className="text-[13px] text-ink-500">
                  Skor akhir: <span className="font-semibold text-ink-900">{score}</span>
                  {score >= highscore && score > 0 && " — rekor baru! 🎉"}
                </div>
                <button
                  type="button"
                  onClick={restart}
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-accent text-paper text-[14px] font-semibold hover:opacity-90 active:scale-95 transition"
                >
                  <RotateCcw className="h-4 w-4" strokeWidth={2} />
                  Main lagi
                </button>
              </div>
            ) : phase === "result" && verdict ? (
              <div className="text-center space-y-3">
                <div className="text-[32px]">{verdict.emoji}</div>
                <div className="text-[15px] font-semibold text-ink-900">
                  {verdict.title}{" "}
                  {verdict.points > 0 && <span className="text-accent">+{verdict.points}</span>}
                </div>
                <div className="text-[13px] text-ink-500 max-w-[320px]">{verdict.detail}</div>
                <button
                  type="button"
                  onClick={nextCustomer}
                  className="h-10 px-5 rounded-xl bg-accent text-paper text-[14px] font-semibold hover:opacity-90 active:scale-95 transition"
                >
                  Pelanggan berikutnya →
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onPointerDown={startFilling}
                    onPointerUp={stopFilling}
                    onPointerLeave={stopFilling}
                    onPointerCancel={stopFilling}
                    onContextMenu={(e) => e.preventDefault()}
                    className="h-16 w-16 rounded-full bg-red text-paper flex items-center justify-center shadow-[var(--shadow-sr)] select-none touch-none active:scale-95 transition-transform"
                    aria-label="Tahan untuk mengisi bensin"
                  >
                    <Fuel className="h-7 w-7" strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    onClick={handDelivery}
                    disabled={liters === 0}
                    className="h-10 px-5 rounded-xl bg-ink-900 text-paper text-[14px] font-semibold disabled:opacity-30 hover:opacity-90 active:scale-95 transition"
                  >
                    Serahkan
                  </button>
                </div>
                <p className="text-[12px] text-ink-400">
                  Tahan tombol merah atau tahan klik nozzle di tangki — tap singkat untuk menambah
                  sedikit demi sedikit
                </p>
              </div>
            )}
          </Card>

          {/* Mesin pompa */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Dispenser · Pertamax</span>
              <span className="text-[11px] font-medium text-ink-400">Ronde {round}</span>
            </div>
            <div className="rounded-xl bg-ink-900 p-4 space-y-3">
              <PumpReadout
                label="Rupiah"
                value={money.toLocaleString("id-ID")}
                accentClass="text-[#5eead4]"
              />
              <PumpReadout
                label="Liter"
                value={liters.toFixed(3).replace(".", ",")}
                accentClass="text-[#fbbf24]"
              />
              <PumpReadout
                label="Harga/Liter"
                value={PRICE_PER_LITER.toLocaleString("id-ID")}
                accentClass="text-paper/70"
                small
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[13px]">
                <span className="text-ink-500">Pesanan</span>
                <span className="font-semibold text-ink-900">
                  {formatRupiah(order.targetMoney)}
                </span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-ink-500">Skor</span>
                <span className="font-semibold text-accent">{score}</span>
              </div>
            </div>
            <div className="rounded-xl bg-ink-40 p-3 text-[12px] leading-relaxed text-ink-500">
              <span className="font-semibold text-ink-700">Aturan:</span> berhenti sedekat mungkin
              dengan pesanan. Pas (±Rp 100) = 100 poin. Kelebihan Rp 100 atau kurang lebih dari Rp
              1.500 = kehilangan 1 nyawa.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PumpReadout({
  label,
  value,
  accentClass,
  small = false,
}: {
  label: string;
  value: string;
  accentClass: string;
  small?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[11px] uppercase tracking-wider text-paper/50">{label}</span>
      <span
        className={
          "doc-num font-bold tabular-nums " +
          accentClass +
          (small ? " text-[14px]" : " text-[24px] leading-7")
        }
      >
        {value}
      </span>
    </div>
  );
}
