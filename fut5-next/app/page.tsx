'use client'
import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Users, Trophy, Share, Trash2, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

// 🔥 Firestore
import { db } from './firebase'; // o teu firebase.ts está em /app
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

type Player = { id: string; name: string };
type Team = Player[];
type Split = { teamA: Team; teamB: Team };
type Submission = { id: string; author: string; split: Split; createdAt: number };

const uid = () => Math.random().toString(36).slice(2, 10);
const makeEmptyPlayers = (): Player[] =>
  Array.from({ length: 10 }, () => ({ id: uid(), name: '' }));

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

const Jersey: React.FC<{ label: string; selected?: boolean; onClick?: () => void }> = ({ label, selected, onClick }) => (
  <motion.div
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.98 }}
    className={`relative inline-flex h-12 w-10 cursor-pointer items-center justify-center rounded-b-2xl border p-1 shadow-sm ${selected ? 'bg-emerald-500 text-white' : 'bg-white'}`}
    onClick={onClick}
  >
    <div className="absolute -top-2 left-1/2 h-3 w-8 -translate-x-1/2 rounded-md border bg-inherit" />
    <span className="text-xs font-semibold text-center leading-tight z-10 px-1">{label}</span>
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
  // A data separa os jogos (cada data é um doc em /games/default/days/{date})
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  // Estado partilhado (vem do Firestore em tempo real)
  const [players, setPlayers] = useState<Player[]>(makeEmptyPlayers());
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [author, setAuthor] = useState('');
  const [selectedA, setSelectedA] = useState<Set<string>>(new Set());

  // Listener realtime do documento do dia
  useEffect(() => {
    const ref = doc(db, 'games', 'default', 'days', date);
    const unsub = onSnapshot(ref, async (snap) => {
      if (!snap.exists()) {
        // cria o doc do dia com estrutura base (reset para novas datas)
        await setDoc(ref, { players: makeEmptyPlayers(), submissions: [] });
        return;
      }
      const data = snap.data() as { players?: Player[]; submissions?: Submission[] };
      setPlayers(() => {
        const arr = data.players ?? makeEmptyPlayers();
        return Array.from({ length: 10 }, (_, i) => arr[i] ?? { id: uid(), name: '' });
      });
      setSubmissions(data.submissions ?? []);
    });
    setSelectedA(new Set()); // limpa seleção temporária ao trocar de data
    return () => unsub();
  }, [date]);

  const namedPlayers = useMemo(() => players.filter(p => p.name.trim() !== ''), [players]);
  const readyForSubmissions =
    namedPlayers.length === 10 &&
    new Set(namedPlayers.map(p => p.name.trim().toLowerCase())).size === 10;

  const shareText = useMemo(() => {
    const n = namedPlayers.map(p => p.name).join(', ');
    return `Fut5 ${date}: ${n}`;
  }, [namedPlayers, date]);

  const updatePlayersRemote = async (next: Player[]) => {
    const ref = doc(db, 'games', 'default', 'days', date);
    await setDoc(ref, { players: next }, { merge: true });
  };
  const updateSubmissionsRemote = async (next: Submission[]) => {
    const ref = doc(db, 'games', 'default', 'days', date);
    await setDoc(ref, { submissions: next }, { merge: true });
  };

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

  const handleSavePlayers = async () => {
    if (!readyForSubmissions) { toast.error('Insere 10 nomes únicos.'); return; }
    await updatePlayersRemote(players);
    toast.success('Jogadores guardados!');
  };

  const handleSubmitSplit = async () => {
    if (!readyForSubmissions) return toast.error('Define primeiro os 10 jogadores.');
    if (selectedA.size !== 5) return toast.error('Escolhe exatamente 5 camisolas para a Equipa A.');

    const split = namesToSplit(Array.from(selectedA), namedPlayers);
    const sub: Submission = { id: uid(), author: author || 'Anónimo', split, createdAt: Date.now() };

    const next = [sub, ...submissions];
    setSubmissions(next);                // update otimista
    await updateSubmissionsRemote(next); // sincroniza
    setSelectedA(new Set());
    toast.success('Formação submetida!');
  };

  const consensus = useMemo(() => {
    if (submissions.length === 0) return null;
    const counts = new Map<string, { split: Split; votes: number }>();
    for (const s of submissions) {
      const k = canonicalSplitKey(s.split);
      const entry = counts.get(k) ?? { split: s.split, votes: 0 };
      entry.votes += 1; counts.set(k, entry);
    }
    const top = [...counts.values()].sort((a, b) => b.votes - a.votes)[0];
    return top;
  }, [submissions]);

  return (
    <div className='container'>
      <header className='mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='text-2xl md:text-3xl font-bold tracking-tight'>Fut5 — Gestor de Equipas 5×5</h1>
          <p className='text-sm text-neutral-500'>Dados partilhados em tempo real por data.</p>
        </div>
        <div className='flex items-center gap-2'>
          <Input type='date' value={date} onChange={(e) => setDate(e.target.value)} />
          <Button variant='outline' onClick={() => { navigator.clipboard.writeText(shareText); toast.success('Texto copiado.'); }}>
            <Share className='mr-2 h-4 w-4'/>Partilhar
          </Button>
        </div>
      </header>

      <Tabs defaultValue='jogadores' className='w-full'>
        <TabsList>
          <TabsTrigger value='jogadores'><Users className='mr-2 h-4 w-4'/>Jogadores</TabsTrigger>
          <TabsTrigger value='submeter'><Plus className='mr-2 h-4 w-4'/>Submeter</TabsTrigger>
          <TabsTrigger value='resultado'><Trophy className='mr-2 h-4 w-4'/>Resultado</TabsTrigger>
        </TabsList>

        {/* JOGADORES */}
        <TabsContent valueFor='jogadores'>
          <Card>
            <CardHeader><CardTitle>Insere os 10 jogadores</CardTitle></CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3'>
                {players.map((p, i) => (
                  <div key={p.id} className='flex items-center gap-2'>
                    <span className='badge w-7 justify-center text-center'>{i + 1}</span>
                    <Input
                      placeholder={`Jogador ${i + 1}`}
                      value={p.name}
                      onChange={async (e) => {
                        const name = e.target.value;
                        const next = players.map(pp => pp.id === p.id ? { ...pp, name } : pp);
                        setPlayers(next);               // otimista
                        await updatePlayersRemote(next); // sync
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className='flex items-center justify-between'>
                <div className='text-sm text-neutral-500'>Precisas de 10 nomes únicos.</div>
                <div className='flex gap-2'>
                  <Button variant='outline' onClick={async () => {
                    const next = makeEmptyPlayers();
                    setPlayers(next);
                    setSubmissions([]);
                    setSelectedA(new Set());
                    await setDoc(doc(db, 'games', 'default', 'days', date), { players: next, submissions: [] }, { merge: true });
                  }}>
                    <Trash2 className='mr-2 h-4 w-4'/>Limpar
                  </Button>
                  <Button onClick={handleSavePlayers}>Guardar</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUBMETER */}
        <TabsContent valueFor='submeter'>
          <Card>
            <CardHeader><CardTitle>Escolhe a tua formação</CardTitle></CardHeader>
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

              <div className='grid gap-3 md:grid-cols-3 md:items-end'>
                <div className='md:col-span-2'>
                  <label className='mb-1 block text-sm'>O teu nome (para a submissão)</label>
                  <Input placeholder='Ex: Ruben' value={author} onChange={(e) => setAuthor(e.target.value)} />
                </div>
                <Button className='w-full' onClick={handleSubmitSplit}>Submeter</Button>
              </div>

              {submissions.length > 0 && (
                <div className='mt-4'>
                  <div className='mb-2 text-sm text-neutral-500'>Submissões ({submissions.length})</div>
                  <div className='grid gap-2'>
                    {submissions.map(s => (
                      <div key={s.id} className='flex items-center justify-between rounded-md border p-2 text-sm'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <span className='badge'>{new Date(s.createdAt).toLocaleTimeString()}</span>
                          <span className='font-medium'>{s.author}</span>
                          <span className='text-neutral-500'>→ A: {s.split.teamA.map(p => p.name).join(', ')}</span>
                        </div>
                        <Button
                          variant='ghost'
                          onClick={async () => {
                            const next = submissions.filter(x => x.id !== s.id);
                            setSubmissions(next);
                            await updateSubmissionsRemote(next);
                          }}
                        >
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

        {/* RESULTADO */}
        <TabsContent valueFor='resultado'>
          {consensus ? (
            <div className='space-y-4'>
              <Pitch title={`Consenso — ${consensus.votes} voto(s)`} teamLeft={consensus.split.teamA} teamRight={consensus.split.teamB} />
            </div>
          ) : (
            <Card>
              <CardHeader><CardTitle>Resultado</CardTitle></CardHeader>
              <CardContent className='text-sm text-neutral-500'>Ainda não há submissões suficientes. Vai ao separador "Submeter".</CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <footer className='mt-8 text-center text-xs text-neutral-500'>
        <p>💡 Dados sincronizados em /games/default/days/{'{date}'} (Firestore).</p>
      </footer>
    </div>
  );
}
