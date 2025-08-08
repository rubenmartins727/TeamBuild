'use client'
import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Plus, Users, Trophy, Share, Trash2, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

type Player = { id: string; name: string };
type Team = Player[];
type Split = { teamA: Team; teamB: Team };
type Submission = { id: string; author: string; split: Split; createdAt: number };

// ----------------- utils
const uid = () => Math.random().toString(36).slice(2, 10);
const canonicalSplitKey = (split: Split) => {
  const a = [...split.teamA.map(p => p.name)].sort();
  const b = [...split.teamB.map(p => p.name)].sort();
  const [t1, t2] = [a, b].sort((x, y) => x.join(',').localeCompare(y.join(',')));
  return `${t1.join('|')}__${t2.join('|')}`;
};
const namesToSplit = (namesA: string[], allPlayers: Player[]): Split => {
  const setA = new Set(namesA);
  const teamA = allPlayers.filter(p => setA.has(p.name));
  const teamB = allPlayers.filter(p => !setA.has(p.name));
  return { teamA, teamB };
};
const useLocalState = <T,>(key: string, initial: T) => {
  const [state, setState] = useState<T>(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(state)); } catch {} }, [key, state]);
  return [state, setState] as const;
};

// ----------------- estado por dia (players + submissions)
type DayState = { players: Player[]; submissions: Submission[] };

const makeEmptyPlayers = () =>
  Array.from({ length: 10 }, () => ({ id: uid(), name: '' }));

const emptyDay = (): DayState => ({ players: makeEmptyPlayers(), submissions: [] });

const dayKey = (date: string) => `fut5/day/${date}`;

const loadDay = (date: string): DayState => {
  try {
    const raw = localStorage.getItem(dayKey(date));
    if (raw) {
      const parsed = JSON.parse(raw) as DayState;
      const fixedPlayers =
        parsed.players.length === 10
          ? parsed.players
          : Array.from({ length: 10 }, (_, i) => parsed.players[i] ?? { id: uid(), name: '' });
      return { players: fixedPlayers, submissions: parsed.submissions ?? [] };
    }
  } catch {}
  return emptyDay();
};

const saveDay = (date: string, state: DayState) => {
  try { localStorage.setItem(dayKey(date), JSON.stringify(state)); } catch {}
};

// ----------------- UI
const Jersey: React.FC<{
  label: string;
  selected?: boolean;
  onClick?: () => void;
}> = ({ label, selected, onClick }) => (
  <motion.div
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.98 }}
    className={`relative inline-flex h-12 w-10 cursor-pointer items-center justify-center rounded-b-2xl border p-1 shadow-sm ${
      selected ? 'bg-emerald-500 text-white' : 'bg-white'
    }`}
    onClick={onClick}
  >
    <div className="absolute -top-2 left-1/2 h-3 w-8 -translate-x-1/2 rounded-md border bg-inherit" />
    <span className="text-xs font-semibold text-center leading-tight z-10 px-1">
      {label}
    </span>
  </motion.div>
);

const Pitch: React.FC<{ title: string; teamLeft: Team; teamRight: Team }> = ({ title, teamLeft, teamRight }) => {
  const L = teamLeft.map(p => p.name);
  const R = teamRight.map(p => p.name);
  return (
    <Card className='w-full'>
      <CardHeader className='pb-2'><CardTitle className='flex items-center gap-2'><Trophy className='h-5 w-5'/> {title}</CardTitle></CardHeader>
      <CardContent>
        <div className='relative mx-auto grid h-[360px] w-full max-w-4xl grid-cols-2 overflow-hidden rounded-2xl border bg-green-700/30'>
          <div className='absolute left-1/2 top-0 h-full w-0.5 bg-white/60' />
          <div className='absolute inset-4 border-2 border-white/30 rounded-xl' />
          <div className='flex flex-col items-center justify-evenly p-3'>
            <div className='text-xs text-white/90'>Team A</div>
            <div className='grid grid-cols-2 gap-3'>
              {L.map(n => <Jersey key={n} label={n} />)}
            </div>
          </div>
          <div className='flex flex-col items-center justify-evenly p-3'>
            <div className='text-xs text-white/90'>Team B</div>
            <div className='grid grid-cols-2 gap-3'>
              {R.map(n => <Jersey key={n} label={n} />)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function Page() {
  // data selecionada e autor mantêm-se globais
  const [date, setDate] = useLocalState<string>('fut5/date', new Date().toISOString().slice(0, 10));
  const [author, setAuthor] = useLocalState<string>('fut5/author', '');

  // estado do dia atual
  const [dayState, setDayState] = useState<DayState>(() =>
    (typeof window !== 'undefined' ? loadDay(date) : emptyDay())
  );
  const [selectedA, setSelectedA] = useState<Set<string>>(new Set());

  // garante 10 players e persiste sempre que mudar
  useEffect(() => {
    if (dayState.players.length !== 10) {
      setDayState(s => ({
        ...s,
        players: Array.from({ length: 10 }, (_, i) => s.players[i] ?? { id: uid(), name: '' })
      }));
    }
  }, [dayState.players]);

  useEffect(() => { saveDay(date, dayState); }, [date, dayState]);

  // quando muda a data: carrega estado dessa data e limpa seleção temporária
  const onDateChange = (newDate: string) => {
    setDate(newDate);
    setDayState(loadDay(newDate));
    setSelectedA(new Set());
  };

  const namedPlayers = useMemo(
    () => dayState.players.filter(p => p.name.trim() !== ''),
    [dayState.players]
  );
  const readyForSubmissions =
    namedPlayers.length === 10 &&
    new Set(namedPlayers.map(p => p.name.trim().toLowerCase())).size === 10;

  const toggleSelect = (name: string) => {
    setSelectedA(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      if (next.size > 5) {
        const arr = Array.from(next);
        next.clear(); arr.slice(arr.length - 5).forEach(n => next.add(n));
      }
      return next;
    });
  };

  const clearAll = () => {
    setDayState(emptyDay());
    setSelectedA(new Set());
  };

  const handleSavePlayers = () => {
    if (!readyForSubmissions) { toast.error('Insere 10 nomes únicos.'); return; }
    toast.success('Jogadores guardados!');
  };

  const handleSubmitSplit = () => {
    if (!readyForSubmissions) return toast.error('Define primeiro os 10 jogadores.');
    if (selectedA.size !== 5) return toast.error('Escolhe exatamente 5 camisolas para a Equipa A.');
    const a = Array.from(selectedA);
    const split = namesToSplit(a, namedPlayers);
    const sub: Submission = { id: uid(), author: author || 'Anónimo', split, createdAt: Date.now() };

    const recentSame = dayState.submissions.find(s =>
      s.author === sub.author &&
      canonicalSplitKey(s.split) === canonicalSplitKey(sub.split) &&
      Date.now() - s.createdAt < 60000
    );
    if (recentSame) return toast.message('Já submeteste esta formação há pouco.');

    setDayState(s => ({ ...s, submissions: [sub, ...s.submissions] }));
    setSelectedA(new Set());
    toast.success('Formação submetida! Obrigado.');
  };

  const consensus = useMemo(() => {
    if (dayState.submissions.length === 0) return null;
    const counts = new Map<string, { key: string; split: Split; votes: number }>();
    for (const s of dayState.submissions) {
      const k = canonicalSplitKey(s.split);
      const entry = counts.get(k) ?? { key: k, split: s.split, votes: 0 };
      entry.votes += 1; counts.set(k, entry);
    }
    const top = [...counts.values()].sort((a, b) => b.votes - a.votes)[0];
    const aNames = top.split.teamA.map(p => p.name).sort();
    const bNames = top.split.teamB.map(p => p.name).sort();
    const [left, right] = [aNames, bNames].sort((x, y) => x[0].localeCompare(y[0]));
    const toTeam = (names: string[]): Team => names.map(n => namedPlayers.find(p => p.name === n)!).filter(Boolean);
    return { split: { teamA: toTeam(left), teamB: toTeam(right) }, votes: top.votes };
  }, [dayState.submissions, namedPlayers]);

  const shareText = useMemo(() => {
    const n = namedPlayers.map(p => p.name).join(', ');
    return `Fut5 ${date}: ${n}`;
  }, [namedPlayers, date]);

  return (
    <div className='container'>
      <header className='mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='text-2xl md:text-3xl font-bold tracking-tight'>Fut5 — Gestor de Equipas 5×5</h1>
          <p className='text-sm text-neutral-500'>Cria a lista de 10, cada um propõe as equipas, e vemos o consenso.</p>
        </div>
        <div className='flex items-center gap-2'>
          <Input type='date' value={date} onChange={(e) => onDateChange(e.target.value)} />
          <Button variant='outline' onClick={() => { navigator.clipboard.writeText(shareText); toast.success('Texto copiado para partilhar os nomes.'); }}>
            <Share className='mr-2 h-4 w-4'/>Partilhar
          </Button>
        </div>
      </header>

      <Tabs defaultValue='jogadores' className='w-full'>
        <TabsList>
          <TabsTrigger value='jogadores'><Users className='mr-2 h-4 w-4'/>Jogadores</TabsTrigger>
          <TabsTrigger value='submeter'><Plus className='mr-2 h-4 w-4'/>Submeter Equipas</TabsTrigger>
          <TabsTrigger value='resultado'><Trophy className='mr-2 h-4 w-4'/>Resultado</TabsTrigger>
        </TabsList>

        <TabsContent valueFor='jogadores'>
          <Card>
            <CardHeader><CardTitle>1) Insere os 10 jogadores do dia</CardTitle></CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3'>
                {dayState.players.map((p, i) => (
                  <div key={p.id} className='flex items-center gap-2'>
                    <span className='badge w-7 justify-center text-center'>{i + 1}</span>
                    <Input
                      placeholder={`Jogador ${i + 1}`}
                      value={p.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setDayState(s => ({
                          ...s,
                          players: s.players.map(pp => pp.id === p.id ? { ...pp, name } : pp)
                        }));
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className='flex items-center justify-between'>
                <div className='text-sm text-neutral-500'>Precisas de 10 nomes únicos.</div>
                <div className='flex gap-2'>
                  <Button variant='outline' onClick={clearAll}><Trash2 className='mr-2 h-4 w-4'/>Limpar</Button>
                  <Button onClick={handleSavePlayers}>Guardar</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent valueFor='submeter'>
          <Card>
            <CardHeader><CardTitle>2) Escolhe a tua formação</CardTitle></CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid gap-3 md:grid-cols-[1fr_auto_1fr] items-start'>
                <div>
                  <div className='mb-2 text-sm text-neutral-500'>Toca em 5 camisolas para a Equipa A</div>
                  <div className='flex flex-wrap gap-2'>
                    {namedPlayers.map(p => (
                      <Jersey key={p.id} label={p.name} selected={selectedA.has(p.name)} onClick={() => toggleSelect(p.name)} />
                    ))}
                  </div>
                </div>
                <div className='flex flex-col items-center gap-2 p-2'>
                  <ChevronRight className='h-6 w-6'/>
                  <div className='text-xs text-neutral-500'>A/B<br/>auto</div>
                </div>
                <div className='rounded-lg border p-3'>
                  <div className='mb-2 text-sm'>Pré-visualização</div>
                  <div className='grid grid-cols-2 gap-3'>
                    <div>
                      <div className='mb-1 text-xs text-neutral-500'>Equipa A ({selectedA.size}/5)</div>
                      <div className='flex flex-wrap gap-2'>
                        {Array.from(selectedA).map(n => <Jersey key={n} label={n} selected />)}
                      </div>
                    </div>
                    <div>
                      <div className='mb-1 text-xs text-neutral-500'>Equipa B ({Math.max(0, 5 - selectedA.size)}/5)</div>
                      <div className='flex flex-wrap gap-2'>
                        {namedPlayers.filter(p => !selectedA.has(p.name)).slice(0, 5 - Math.min(5, selectedA.size)).map(p => <Jersey key={p.id} label={p.name} />)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className='separator' />

              <div className='grid gap-3 md:grid-cols-3 md:items-end'>
                <div className='md:col-span-2'>
                  <label className='mb-1 block text-sm'>O teu nome (para a submissão)</label>
                  <Input placeholder='Ex: Ruben' value={author} onChange={(e) => setAuthor(e.target.value)} />
                </div>
                <Button className='w-full' onClick={handleSubmitSplit}>Submeter</Button>
              </div>

              {dayState.submissions.length > 0 && (
                <div className='mt-4'>
                  <div className='mb-2 text-sm text-neutral-500'>Submissões ({dayState.submissions.length})</div>
                  <div className='grid gap-2'>
                    {dayState.submissions.map(s => (
                      <div key={s.id} className='flex items-center justify-between rounded-md border p-2 text-sm'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <span className='badge'>{new Date(s.createdAt).toLocaleTimeString()}</span>
                          <span className='font-medium'>{s.author}</span>
                          <span className='text-neutral-500'>→ A: {s.split.teamA.map(p => p.name).join(', ')}</span>
                        </div>
                        <Button variant='ghost' onClick={() => setDayState(d => ({ ...d, submissions: d.submissions.filter(x => x.id !== s.id) }))}>
                          <Trash2 className='h-4 w-4'/>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent valueFor='resultado'>
          {consensus ? (
            <div className='space-y-4'>
              <Pitch title={`3) Consenso — ${consensus.votes} voto(s)`} teamLeft={consensus.split.teamA} teamRight={consensus.split.teamB} />
            </div>
          ) : (
            <Card>
              <CardHeader><CardTitle>3) Resultado</CardTitle></CardHeader>
              <CardContent className='text-sm text-neutral-500'>Ainda não há submissões suficientes. Vai ao separador "Submeter".</CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <footer className='mt-8 text-center text-xs text-neutral-500'>
        <p>💡 Próximos passos: login/rooms, votação por posição, exportação para imagem, partilha por link.</p>
      </footer>
    </div>
  );
}
