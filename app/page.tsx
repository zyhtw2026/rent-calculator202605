"use client";
import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Calculator, Home, ReceiptText } from "lucide-react";

function parseDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return "NT$0";
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(value);
}

function daysInclusive(start: Date | null, end: Date | null): number {
  if (!start || !end || end < start) return 0;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end - start) / msPerDay) + 1;
}

function getOverlapDays(
  billStart: Date | null,
  billEnd: Date | null,
  moveIn: Date | null,
  moveOut: Date | null
): number {
  if (!billStart || !billEnd || !moveIn) return 0;
  const actualStart = moveIn > billStart ? moveIn : billStart;
  const actualEnd = moveOut && moveOut < billEnd ? moveOut : billEnd;
  return daysInclusive(actualStart, actualEnd);
}

const today = new Date().toISOString().slice(0, 10);

export default function RentUtilitySplitCalculator() {
  const billTypeOptions = ["台電", "台水", "瓦斯", "天然氣", "管理費", "網路費"];

const [billType, setBillType] = useState("");
  const [billStart, setBillStart] = useState("");
  const [billEnd, setBillEnd] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [rooms, setRooms] = useState([
    { id: crypto.randomUUID(), name: "A房", moveIn: "", moveOut: "" },
    { id: crypto.randomUUID(), name: "B房", moveIn: "", moveOut: "" },
    { id: crypto.randomUUID(), name: "C房", moveIn: "", moveOut: "" },
    { id: crypto.randomUUID(), name: "D房", moveIn: "", moveOut: "" },
  ]);

  const result = useMemo(() => {
    const start = parseDate(billStart);
    const end = parseDate(billEnd);
    const amount = Number(totalAmount) || 0;

    const rows = rooms.map((room) => {
      const moveIn = parseDate(room.moveIn);
      const moveOut = parseDate(room.moveOut);
      const days = getOverlapDays(start, end, moveIn, moveOut);
      return { ...room, days };
    });

    const totalDays = rows.reduce((sum, row) => sum + row.days, 0);

    let allocated = 0;
    const calculatedRows = rows.map((row, index) => {
      const ratio = totalDays > 0 ? row.days / totalDays : 0;
      let payable = Math.round(amount * ratio);

      // 把四捨五入造成的尾差補到最後一個有實住天數的房間，讓驗算總額一致。
      const lastActiveIndex = rows.map((r) => r.days > 0).lastIndexOf(true);
      if (index === lastActiveIndex) {
        payable = Math.round(amount) - allocated;
      } else {
        allocated += payable;
      }

      return {
        ...row,
        ratio,
        payable: row.days > 0 ? payable : 0,
      };
    });

    const checkTotal = calculatedRows.reduce((sum, row) => sum + row.payable, 0);

    return { rows: calculatedRows, totalDays, checkTotal, amount };
  }, [billStart, billEnd, totalAmount, rooms]);

  const addRoom = () => {
    const nextLetter = String.fromCharCode(65 + rooms.length);
    setRooms([...rooms, { id: crypto.randomUUID(), name: `${nextLetter}房`, moveIn: "", moveOut: "" }]);
  };

  const removeRoom = (id) => {
    if (rooms.length <= 1) return;
    setRooms(rooms.filter((room) => room.id !== id));
  };

  const updateRoom = (id, key, value) => {
    setRooms(rooms.map((room) => (room.id === id ? { ...room, [key]: value } : room)));
  };

  const fillDemo = () => {
    setBillType("台電");
    setBillStart("2026-03-01");
    setBillEnd("2026-04-30");
    setTotalAmount("4073");
    setRooms([
      { id: crypto.randomUUID(), name: "A房", moveIn: "2026-03-01", moveOut: "" },
      { id: crypto.randomUUID(), name: "B房", moveIn: "2026-03-01", moveOut: "" },
      { id: crypto.randomUUID(), name: "C房", moveIn: "2026-03-19", moveOut: "" },
      { id: crypto.randomUUID(), name: "D房", moveIn: "2026-04-10", moveOut: "" },
    ]);
  };

  const resetAll = () => {
    setBillType("台電");
    setBillStart("");
    setBillEnd("");
    setTotalAmount("");
    setRooms([
      { id: crypto.randomUUID(), name: "A房", moveIn: "", moveOut: "" },
      { id: crypto.randomUUID(), name: "B房", moveIn: "", moveOut: "" },
      { id: crypto.randomUUID(), name: "C房", moveIn: "", moveOut: "" },
      { id: crypto.randomUUID(), name: "D房", moveIn: "", moveOut: "" },
    ]);
  };

  const hasResult = result.totalDays > 0 && result.amount > 0;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <Calculator className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">租屋水電分攤計算器</h1>
          <p className="text-sm leading-6 text-slate-600">
            輸入帳單區間、總金額與每房入住／退租日，自動依實住天數分攤費用。
          </p>
        </div>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <ReceiptText className="h-5 w-5" />
              帳單資料
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>帳單種類</Label>
                <select
  value={billType}
  onChange={(e) => setBillType(e.target.value)}
  className="flex h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
>
  <option value="" disabled>
    選擇帳單種類
  </option>

  {billTypeOptions.map((option) => (
    <option key={option} value={option}>
      {option}
    </option>
  ))}
</select>
              </div>
              <div className="space-y-2">
                <Label>本期帳單總金額</Label>
                <Input type="number" inputMode="numeric" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="例如：4073" />
              </div>
              <div className="space-y-2">
                <Label>帳單起日</Label>
                <Input type="date" value={billStart} onChange={(e) => setBillStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>帳單迄日</Label>
                <Input type="date" value={billEnd} onChange={(e) => setBillEnd(e.target.value)} max={today} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" variant="secondary" className="rounded-xl" onClick={fillDemo}>套用範例</Button>
              <Button type="button" variant="ghost" className="rounded-xl" onClick={resetAll}>清空重填</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Home className="h-5 w-5" />
                房間資料
              </div>
              <Button type="button" onClick={addRoom} className="rounded-xl">
                <Plus className="mr-1 h-4 w-4" /> 新增房間
              </Button>
            </div>

            <div className="space-y-3">
              {rooms.map((room, index) => (
                <div key={room.id} className="rounded-2xl border bg-white p-3 shadow-xs">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-500">房間 {index + 1}</div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => removeRoom(room.id)} disabled={rooms.length <= 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>房號／名稱</Label>
                      <Input value={room.name} onChange={(e) => updateRoom(room.id, "name", e.target.value)} placeholder="例如：A房" />
                    </div>
                    <div className="space-y-2">
                      <Label>入住日</Label>
                      <Input type="date" value={room.moveIn} onChange={(e) => updateRoom(room.id, "moveIn", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>退租日</Label>
                      <Input type="date" value={room.moveOut} onChange={(e) => updateRoom(room.id, "moveOut", e.target.value)} placeholder="仍在住可留空" />
                      <p className="text-xs leading-5 text-slate-500">仍在居住請留空。若非新住戶，入住日請填寫帳單起算日。</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 bg-slate-900 text-white shadow-sm print:bg-white print:text-slate-900">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div>
              <h2 className="text-xl font-bold">分攤結果</h2>
              <p className="mt-1 text-sm text-slate-300 print:text-slate-600">
                {billType || "帳單"}｜{billStart || "起日"} ～ {billEnd || "迄日"}｜總金額 {formatCurrency(result.amount)}
              </p>
            </div>

            {!hasResult ? (
              <div className="rounded-2xl bg-white/10 p-4 text-sm text-slate-200 print:bg-slate-100 print:text-slate-700">
                請先輸入帳單金額、帳單區間與至少一個房間的入住日，系統會自動計算分攤結果。
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl bg-white text-slate-900">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="px-3 py-3 text-left">房號</th>
                        <th className="px-3 py-3 text-right">實住天數</th>
                        <th className="px-3 py-3 text-right">分攤比例</th>
                        <th className="px-3 py-3 text-right">應付金額</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row) => (
                        <tr key={row.id} className="border-t">
                          <td className="px-3 py-3 font-medium">{row.name || "未命名"}</td>
                          <td className="px-3 py-3 text-right">{row.days} 天</td>
                          <td className="px-3 py-3 text-right">{(row.ratio * 100).toFixed(2)}%</td>
                          <td className="px-3 py-3 text-right font-semibold">{formatCurrency(row.payable)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/10 p-4 print:bg-slate-100">
                <div className="text-xs text-slate-300 print:text-slate-500">總實住天數</div>
                <div className="mt-1 text-2xl font-bold">{result.totalDays} 天</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 print:bg-slate-100">
                <div className="text-xs text-slate-300 print:text-slate-500">分攤加總</div>
                <div className="mt-1 text-2xl font-bold">{formatCurrency(result.checkTotal)}</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 print:bg-slate-100">
                <div className="text-xs text-slate-300 print:text-slate-500">驗算差額</div>
                <div className="mt-1 text-2xl font-bold">{formatCurrency(result.checkTotal - Math.round(result.amount))}</div>
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 p-4 text-xs leading-6 text-slate-300 print:bg-slate-100 print:text-slate-600">
              計算方式：本期總金額 × 該房實住天數 ÷ 所有房間實住天數總和。入住日與退租日皆以「有居住即算一天」計算。
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
