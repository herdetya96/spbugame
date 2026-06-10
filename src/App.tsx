import { useCallback, useEffect, useRef, useState } from "react";
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
    const v = judge(
      Math.round(litersRef.current * PRICE_PER_LITER),
      order.targetMoney,
    );
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
    <div className="relative h-dvh overflow-hidden bg-canvas">
      {/* Scene 3D memenuhi seluruh layar */}
      <Motorbike3D
        fillFrac={fillFrac}
        targetFrac={0.75}
        filling={holding && phase === "filling"}
        departing={phase === "result" || phase === "gameover"}
        bikeKey={round}
        onFillStart={startFilling}
        onFillStop={stopFilling}
        className="absolute inset-0 w-full h-full"
      />

      {/* Judul + pesanan pelanggan (kiri atas) */}
      <div className="absolute top-3 left-3 md:top-5 md:left-5 z-10 max-w-[62%] md:max-w-[40%] space-y-2.5 pointer-events-none">
        <div className="inline-block rounded-xl bg-paper/85 backdrop-blur px-3 py-2 shadow-[var(--shadow-xs)]">
          <h1 className="text-[15px] md:text-[17px] font-semibold text-ink-900 tracking-[-0.18px]">
            ⛽ Pom Bensin
          </h1>
          <p className="text-[11px] md:text-[12px] text-ink-500">
            Pertamax {formatRupiah(PRICE_PER_LITER)}/liter
          </p>
        </div>
        <div className="flex items-start gap-2">
          <div className="h-9 w-9 shrink-0 rounded-full bg-paper/90 backdrop-blur flex items-center justify-center text-[20px] shadow-[var(--shadow-xs)]">
            {order.customer}
          </div>
          <div className="relative rounded-xl bg-paper/90 backdrop-blur px-3 py-2 text-[13px] md:text-[14px] font-medium text-ink-900 shadow-[var(--shadow-xs)]">
            {phase === "gameover"
              ? "Yah, shift kamu selesai..."
              : `"${order.text}"`}
          </div>
        </div>
      </div>

      {/* Nyawa, rekor & meteran dispenser (kanan atas) */}
      <div className="absolute top-3 right-3 md:top-5 md:right-5 z-10 flex flex-col items-end gap-2">
        <div className="flex items-center gap-3 rounded-full bg-paper/85 backdrop-blur px-3 py-1.5 shadow-[var(--shadow-xs)]">
          <span className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-700">
            <Trophy className="h-4 w-4 text-accent" strokeWidth={1.5} />
            {highscore}
          </span>
          <span className="flex gap-0.5">
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <Heart
                key={i}
                className={
                  "h-4 w-4 " +
                  (i < lives ? "text-red fill-current" : "text-ink-150")
                }
                strokeWidth={1.5}
              />
            ))}
          </span>
        </div>
        <div className="w-[176px] md:w-[200px] rounded-xl bg-ink-900/90 backdrop-blur p-3 space-y-2 shadow-[var(--shadow-sr)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-paper/50 font-semibold">
              Pertamax
            </span>
            <span className="text-[10px] font-medium text-paper/40">
              Ronde {round}
            </span>
          </div>
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
          <div className="border-t border-paper/10 pt-2 space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-paper/50">Pesanan</span>
              <span className="font-semibold text-paper">
                {formatRupiah(order.targetMoney)}
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-paper/50">Skor</span>
              <span className="font-semibold text-[#5eead4]">{score}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Kontrol pengisian (bawah tengah) */}
      {(phase === "ready" || phase === "filling") && (
        <div className="absolute bottom-4 md:bottom-6 inset-x-0 z-10 flex flex-col items-center gap-2 px-4">
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
              className="h-11 px-5 rounded-xl bg-ink-900/90 backdrop-blur text-paper text-[14px] font-semibold disabled:opacity-40 hover:opacity-90 active:scale-95 transition shadow-[var(--shadow-sr)]"
            >
              Serahkan
            </button>
          </div>
          <p className="text-[11px] text-ink-500 text-center max-w-[420px] bg-paper/70 backdrop-blur rounded-full px-3 py-1">
            Tahan tombol merah atau tahan klik nozzle di tangki · geser area
            kosong untuk memutar
          </p>
        </div>
      )}

      {/* Hasil ronde / game over (kartu di tengah) */}
      {phase === "result" && verdict && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink-900/15 backdrop-blur-[2px] px-4">
          <div className="bg-paper rounded-2xl shadow-[var(--shadow-sr)] p-6 text-center space-y-3 max-w-[340px] w-full">
            <div className="text-[36px]">{verdict.emoji}</div>
            <div className="text-[16px] font-semibold text-ink-900">
              {verdict.title}{" "}
              {verdict.points > 0 && (
                <span className="text-accent">+{verdict.points}</span>
              )}
            </div>
            <div className="text-[13px] text-ink-500">{verdict.detail}</div>
            <button
              type="button"
              onClick={nextCustomer}
              className="h-11 px-5 rounded-xl bg-accent text-paper text-[14px] font-semibold hover:opacity-90 active:scale-95 transition"
            >
              Pelanggan berikutnya →
            </button>
          </div>
        </div>
      )}
      {phase === "gameover" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink-900/15 backdrop-blur-[2px] px-4">
          <div className="bg-paper rounded-2xl shadow-[var(--shadow-sr)] p-6 text-center space-y-3 max-w-[340px] w-full">
            <div className="text-[36px]">💔</div>
            <div className="text-[16px] font-semibold text-ink-900">
              Game Over
            </div>
            <div className="text-[13px] text-ink-500">
              Skor akhir:{" "}
              <span className="font-semibold text-ink-900">{score}</span>
              {score >= highscore && score > 0 && " — rekor baru! 🎉"}
            </div>
            <div className="text-[12px] text-ink-400">
              Pas (±Rp 100) = 100 poin. Kelebihan atau kurang &gt; Rp 1.500 = -1
              nyawa.
            </div>
            <button
              type="button"
              onClick={restart}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-accent text-paper text-[14px] font-semibold hover:opacity-90 active:scale-95 transition"
            >
              <RotateCcw className="h-4 w-4" strokeWidth={2} />
              Main lagi
            </button>
          </div>
        </div>
      )}
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
      <span className="text-[11px] uppercase tracking-wider text-paper/50">
        {label}
      </span>
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
