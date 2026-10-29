import { memo, type ReactNode } from 'react'
import {
  Bar, BarChart, CartesianGrid, ErrorBar, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Card, CountUp } from '../components/ui'
import { C, MODEL_COLORS, MODELS, results } from '../data'

const R = results
const axis = { stroke: '#3a4670', tick: { fill: C.muted, fontSize: 15, fontFamily: 'JetBrains Mono' } }
const grid = <CartesianGrid stroke="#263055" strokeDasharray="3 4" vertical={false} />
const tip = (
  <Tooltip cursor={{ fill: 'rgba(123,150,255,0.08)' }} formatter={(v) => (typeof v === 'number' ? v.toFixed(3) : String(v))}
    contentStyle={{ background: '#141B2F', border: '1px solid #263055', borderRadius: 12, fontFamily: 'JetBrains Mono', fontSize: 15 }}
    labelStyle={{ color: C.ink }} itemStyle={{ color: C.ink }} />
)

function ChartCard({ title, note, legend, children, delay }: { title: string; note: string; legend: [string, string, boolean?][]; children: ReactNode; delay: number }) {
  return (
    <Card delay={delay} className="flex min-h-0 flex-col p-5">
      <div className="text-[19px] font-semibold">{title}</div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-muted">
        {legend.map(([name, color, dashed]) => (
          <span key={name} className="flex items-center gap-2">
            <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke={color} strokeWidth={dashed === undefined ? 10 : 3}
              strokeDasharray={dashed ? '5 4' : undefined} /></svg>{name}
          </span>
        ))}
      </div>
      <div className="mt-2 min-h-0 flex-1">{children}</div>
      <div className="mt-2 text-[14px] leading-snug text-muted">{note}</div>
    </Card>
  )
}

// built once: new arrays on every render would make Recharts replay its animation (e.g. on each tour caption)
const baseline = MODELS.map((m) => {
  const pf = R.baseline.politifact.find((b) => b.model === m)!, gc = R.baseline.gossipcop.find((b) => b.model === m)!
  return { model: m, PolitiFact: pf.acc, pfErr: pf.accStd, GossipCop: gc.acc, gcErr: gc.accStd }
})
const defense = MODELS.map((m) => ({ model: m, Clean: R.defense20[m].clean, Attack: R.defense20[m].attack,
  '+ Bot filter': R.defense20[m].filter, '+ Adv training': R.defense20[m].adv }))

function Results() {
  const g = R.defense20.GCN
  const kpis: [ReactNode, string, string][] = [
    [<><CountUp to={g.clean} decimals={3} /> <span className="text-muted">→</span> <CountUp to={g.attack} decimals={3} /></>,
      'GCN accuracy under 20% smart bots', C.coral],
    [<CountUp to={g.asrAttack * 100} decimals={1} suffix="%" />, 'of caught fake news flipped to REAL', C.coral],
    [<CountUp to={g.adv} decimals={3} />, 'recovered with adversarial training (adaptive attack)', C.green],
    [<CountUp to={R.filter.falseRemovalTest * 100} decimals={1} suffix="%" />, 'genuine users wrongly removed by the bot filter', C.amber],
  ]
  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-5">
      <div className="grid grid-cols-4 gap-5">
        {kpis.map(([v, label, color], i) => (
          <Card key={label} delay={i * 0.08} className="px-6 py-4">
            <div className="text-[clamp(28px,2.4vw,40px)] font-bold" style={{ color }}>{v}</div>
            <div className="mt-1 text-[16px] text-muted">{label}</div>
          </Card>
        ))}
      </div>
      <div className="grid min-h-0 grid-cols-3 gap-5">
        <ChartCard delay={0.25} title="Baseline accuracy (no attack)" legend={[['PolitiFact', C.blue], ['GossipCop', C.green]]}
          note={`Test sets: PolitiFact ${R.datasets.politifact.test}, GossipCop ${R.datasets.gossipcop.test.toLocaleString('en-US')} graphs · mean ± std, 3 seeds · axis starts at chance (0.5)`}>
          <ResponsiveContainer>
            <BarChart data={baseline} barGap={6} margin={{ top: 10, right: 6, left: -6, bottom: 0 }}>
              {grid}<XAxis dataKey="model" {...axis} /><YAxis domain={[0.5, 1]} ticks={[0.5, 0.6, 0.7, 0.8, 0.9, 1]} {...axis} />{tip}
              <Bar dataKey="PolitiFact" fill={C.blue} radius={[6, 6, 0, 0]} animationDuration={900}>
                <ErrorBar dataKey="pfErr" stroke={C.ink} width={6} />
              </Bar>
              <Bar dataKey="GossipCop" fill={C.green} radius={[6, 6, 0, 0]} animationDuration={900} animationBegin={200}>
                <ErrorBar dataKey="gcErr" stroke={C.ink} width={6} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard delay={0.35} title="Attack: accuracy vs bots injected"
          legend={[...MODELS.map((m) => [m, MODEL_COLORS[m], false] as [string, string, boolean]), ['smart bots', C.ink, false], ['copied bots', C.ink, true]]}
          note="PolitiFact test set · only fake stories attacked · smart (greedy) bots: seed 0 · copied (camouflaged) bots: mean of 3 seeds">
          <ResponsiveContainer>
            <LineChart data={R.attackCurve} margin={{ top: 10, right: 14, left: -6, bottom: 0 }}>
              {grid}
              <XAxis dataKey="p" type="number" domain={[0, 20]} ticks={[0, 5, 10, 20]} tickFormatter={(v) => `${v}%`} {...axis} />
              <YAxis domain={[0.55, 0.9]} ticks={[0.6, 0.7, 0.8, 0.9]} {...axis} />{tip}
              {MODELS.map((m, i) => (
                <Line key={`${m}c`} dataKey={`${m}_camo`} name={`${m} copied`} stroke={MODEL_COLORS[m]} strokeWidth={2.5} strokeDasharray="6 5"
                  dot={false} animationDuration={1200} animationBegin={200 + i * 150} />
              ))}
              {MODELS.map((m, i) => (
                <Line key={`${m}g`} dataKey={`${m}_greedy`} name={`${m} smart`} stroke={MODEL_COLORS[m]} strokeWidth={3.5}
                  dot={{ r: 5, fill: MODEL_COLORS[m], strokeWidth: 0 }} animationDuration={1400} animationBegin={500 + i * 150} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard delay={0.45} title="Defenses at 20% smart bots"
          legend={[['Clean', '#9AA6D6'], ['Attack', C.coral], ['+ Bot filter', C.amber], ['+ Adv training', C.green]]}
          note={`PolitiFact · seed 0 · adv-trained model attacked adaptively (bots re-crafted against it); transfer attack: GCN ${g.advTransfer.toFixed(3)}`}>
          <ResponsiveContainer>
            <BarChart data={defense} barGap={3} margin={{ top: 10, right: 6, left: -6, bottom: 0 }}>
              {grid}<XAxis dataKey="model" {...axis} /><YAxis domain={[0.5, 1]} ticks={[0.5, 0.6, 0.7, 0.8, 0.9, 1]} {...axis} />{tip}
              {([['Clean', '#9AA6D6'], ['Attack', C.coral], ['+ Bot filter', C.amber], ['+ Adv training', C.green]] as const).map(([k, c], i) => (
                <Bar key={k} dataKey={k} fill={c} radius={[5, 5, 0, 0]} animationDuration={900} animationBegin={250 + i * 180}>
                  {(k === 'Attack' || k === '+ Adv training') && (
                    <LabelList dataKey={k} position="top" formatter={(v) => Number(v).toFixed(2)} fill={c} fontSize={14} fontFamily="JetBrains Mono" />
                  )}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

// no props and no demo state: skip re-renders from tour captions, which would replay Recharts animations
export default memo(Results)
