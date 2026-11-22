// Prowadzący: charaktery i jego teksty.
// w = woźny (zmęczony, ale w gruncie rzeczy miły), a = absurdalny, s = sarkastyczny, b = bezczelny, c = czarny humor, mix = mieszanka, off = wyłączony.
// Zmienne: {name} – imię w mianowniku, {nameG} – w dopełniaczu, {judge} – sędzia.

export const HOSTS = [
  { v: 'mix', key: 'hostMix' },
  { v: 'w', key: 'hostW' },
  { v: 'a', key: 'hostA' },
  { v: 's', key: 'hostS' },
  { v: 'b', key: 'hostB' },
  { v: 'c', key: 'hostC' },
  { v: 'off', key: 'off' },
];

// Ile razy prowadzący się odzywa (żeby nie przegadał gry).
export const CHANCE = { start: 1, question: 0.4, reveal: 0.5, judge: 0.55, winner: 0.75, slow: 1, end: 1 };

// Mina postaci przy danym tekście.
const EMO = {
  w: { start: 'bored', question: 'card', reveal: 'neutral', judge: 'smug', winner: 'happy', slow: 'bored', end: 'happy' },
  a: { start: 'crazy', question: 'crazy', reveal: 'happy', judge: 'crazy', winner: 'laugh', slow: 'bored', end: 'crazy' },
  s: { start: 'smug', question: 'smug', reveal: 'smug', judge: 'smug', winner: 'smug', slow: 'bored', end: 'smug' },
  b: { start: 'happy', question: 'evil', reveal: 'laugh', judge: 'smug', winner: 'laugh', slow: 'shocked', end: 'laugh' },
  c: { start: 'evil', question: 'evil', reveal: 'evil', judge: 'evil', winner: 'evil', slow: 'bored', end: 'evil' },
};

const PL = {
  w: {
    start: ['Dzień dobry. Ja tu w zasadzie tylko sprzątam, ale prowadzący nie przyszedł. No to gramy.', 'Kazali mi poprowadzić. Mop odstawiłem, nerwy zostały. Zaczynamy.', 'Witam państwa. Proszę nie deptać, dopiero umyłem. A teraz gra.', 'Miało być dwie godziny sprzątania, a jest teleturniej. Dobra, dla was to zrobię.'],
    question: ['Pytanie. Znalazłem je za kaloryferem.', 'Czytam, bo kierownik kazał. Ja bym tego nie pisał.', 'Następna karta. Trochę się klei, ktoś tu jadł pączka.', 'Pytanie. Okulary mam po szwagrze, więc jakby co, to on czyta.'],
    reveal: ['No to czytam. Jakby co, ja tylko przekazuję.', 'Odpowiedzi. Ja się tylko podpisuję pod sprzątaniem, nie pod tym.', 'Czytam wasze odpowiedzi. Potem to wszystko i tak ja będę zamiatał.', 'Dobra, odkrywamy. Tylko spokojnie, bez rzucania kartami.'],
    judge: ['{judge}, wybierz coś. Ja mam jeszcze korytarz do umycia.', '{judge}, nie stresuj się. Najwyżej się pokłócą, ja posprzątam.', '{judge}, ja bym wziął tę drugą. Ale ja się nie znam, ja tylko myję.', '{judge}, wybieraj. Ja w tym czasie przetrę ekran.'],
    winner: ['Brawo, {name}! Masz u mnie czystą podłogę pod krzesłem.', 'Punkt dla {nameG}. Szczerze? Ładnie. Wzruszyłem się, a to rzadko.', '{name} wygrywa. Dałbym ci cukierka, ale mam tylko płyn do szyb.', 'No proszę, {name}. Kierownik by się ucieszył. Gdyby tu był.'],
    slow: ['{name}, spokojnie, ja też tu nie chcę być, ale wybierz coś.', '{name}, ja w tym czasie umyłem pół podłogi.', '{name}, nie spiesz się, ale ja mam zmianę do dziesiątej.', '{name}, wybierz kartę, bo mi herbata stygnie.'],
    end: ['Koniec gry. Wygrywa {name}. Gratuluję, a teraz wszyscy podnieście nogi, bo myję.', '{name} wygrywa! Było miło. Naprawdę. Nie mówcie kierownikowi.', 'No i po grze. {name} mistrzem. Ja idę po wiadro.', '{name} zwycięża. Dziękuję państwu, światło gaszę ja.'],
  },
  a: {
    start: ['Witam w programie! Dziś nagrodą jest używany odkurzacz i poczucie winy.', 'Zanim zaczniemy: ktoś zostawił w studiu kozę. Jeśli jest wasza, nic nie mówcie.', 'Gramy! Zasady są proste, a ja nie.', 'Uwaga, gra startuje. Proszę zapiąć pasy i godność.'],
    question: ['Następne pytanie wylosował mój chomik. Ma wyrzuty sumienia.', 'To pytanie przyszło do mnie we śnie. Śniła mi się kapusta.', 'Uwaga, pytanie! Czytam je, bo ktoś musi.', 'Pytanie numer… nie wiem, zgubiłem liczydło.'],
    reveal: ['Odkrywamy karty! Proszę trzymać się czegoś stabilnego.', 'Teraz odpowiedzi. Mój doradca, pan Ziemniak, już się śmieje.', 'Czas na odpowiedzi. Bęben, proszę! Nie mamy bębna.', 'Odkrywam. Jeśli coś wybuchnie, to nie ja.'],
    judge: ['{judge}, wybierz zwycięzcę. Albo rzuć monetą, ja tak robię.', '{judge}, decyzja należy do ciebie i do twojego wewnętrznego jednorożca.', '{judge}, wybieraj sercem. Albo wątrobą.', '{judge}, proszę nie dawać się przekupić sernikiem. Chyba że mnie też się dostanie.'],
    winner: ['Brawo, {name}! Nagroda to wyimaginowany kalafior.', '{name} wygrywa rundę! Mój chomik bije brawo.', 'Gratulacje, {name}! Nagrodę proszę odebrać w nieistniejącym okienku.', '{name}! Jak? Dlaczego? Nieważne, punkt!'],
    slow: ['{name}, czekamy! Mój chomik zdążył się w tym czasie ożenić.', 'Halo, {name}? Wysłałem już po ciebie gołębia.', '{name}, karta sama się nie wybierze. Sprawdzałem.', '{name}, pospiesz się, bo zacznę śpiewać.'],
    end: ['Koniec gry! Wygrywa {name}! Nagroda: dożywotni zapas niczego.', '{name} zwycięża! Proszę o owację na stojąco. Albo na leżąco.', 'Koniec! {name} zostaje królem kapusty!', '{name} wygrywa! Zaraz wypuszczę gołębie. Nie mam gołębi.'],
  },
  s: {
    start: ['No to zaczynamy. Proszę nie spodziewać się po sobie zbyt wiele.', 'Witam państwa. Widzę, że poziom intelektualny dopisuje. Prawie.', 'Start gry. Najlepsze odpowiedzi wygrywają, czyli dziś raczej nikt.', 'Zaczynamy. Postarajcie się, ja i tak was ocenię.'],
    question: ['Kolejne pytanie. Spróbujcie tym razem pomyśleć.', 'Pytanie dla ambitnych. Czyli nie dla was.', 'Proste pytanie. Na pewno to zepsujecie.', 'Oto pytanie. Zaskoczcie mnie, choć wątpię.'],
    reveal: ['No to zobaczmy, co wymyśliliście. Trzymajcie oczekiwania nisko.', 'Odpowiedzi. Przygotujcie się na rozczarowanie.', 'Czytam wasze dzieła. Nagroda Nobla raczej nie grozi.', 'Zobaczmy, kto się dziś najbardziej postarał. Nikt? Tak myślałem.'],
    judge: ['{judge}, wybierz najmniej żenującą odpowiedź.', '{judge}, nie spiesz się. My tu mamy całe życie.', '{judge}, wszyscy wiemy, że i tak wybierzesz źle.', '{judge}, pokaż, że masz gust. Albo chociaż udawaj.'],
    winner: ['Gratulacje, {name}. Przy tej konkurencji to nie było trudne.', 'Punkt dla {nameG}. Oklaski. Ciche oklaski.', '{name} wygrywa. Wybitne. Jak na tę grupę.', 'No proszę, {name}. Nawet ślepej kurze trafi się ziarno.'],
    slow: ['{name}, nie spiesz się. Nikt tu nie ma życia.', '{name}, to nie egzamin na prawo jazdy. Wybierz cokolwiek.', '{name} myśli. Rzadkie zjawisko, nie przeszkadzajmy.', '{name}, szukasz sensu istnienia w tych kartach? Nie ma go tam.'],
    end: ['{name} wygrywa. Gratulacje dla najmniej słabej osoby w tym pokoju.', 'Koniec gry. {name} zwycięża, reszta też się starała. Chyba.', '{name} mistrzem wieczoru. Poprzeczka leżała na podłodze, ale jednak.', 'Wygrywa {name}. Niesamowite. Naprawdę nikt się tego nie spodziewał.'],
  },
  b: {
    start: ['Witam, przegrywy! Ktoś z was dziś wygra, ale nie przyzwyczajajcie się.', 'Telefony w dłoń, wstyd do kieszeni. Gramy!', 'Zaczynamy. Kto przegra, zmywa. Tak, ustaliłem to przed chwilą.', 'No dalej, pokażcie, jakie macie zepsute umysły.'],
    question: ['Pytanie. Tylko bez tych grzecznych odpowiedzi, proszę.', 'Dawajcie najgorsze, co macie w ręce.', 'Kto da nudną odpowiedź, ten śpi w wannie.', 'Słuchajcie uważnie, bo drugi raz nie przeczytam. Dobra, przeczytam.'],
    reveal: ['Zobaczmy, kto ma tu najbardziej zepsutą głowę.', 'Odkrywam. Wstydzić się będziecie później.', 'No to jazda z tymi bezeceństwami.', 'Czytam. Przypominam, że wszyscy wiedzą, kto co dał.'],
    judge: ['{judge}, wybieraj, tylko nie bądź mięczakiem.', '{judge}, wszyscy patrzą. Bez presji. No, trochę presji.', '{judge}, jak wybierzesz nudną, to cię wyproszę.', 'Dawaj, {judge}, rozstrzygnij to wreszcie.'],
    winner: ['{name} wygrywa! Reszta, wstydźcie się.', 'Brawo, {name}! Ty zepsuty człowieku.', 'Punkt dla {nameG}. Przegrani, do kąta!', '{name}, nie przyzwyczajaj się do tego uczucia.'],
    slow: ['{name}, rusz się! Starość cię dogania.', 'No, {name}, dawaj, bo zasnę.', '{name}, wybierz wreszcie, a nie czytasz karty jak menu w chińskiej knajpie.', '{name}, wszyscy na ciebie czekają. Ładnie to tak?'],
    end: ['{name} wygrywa! Reszta, rewanż, bo wstyd!', 'Mistrz wieczoru: {name}! Przegrani sprzątają.', '{name} rozwala system. Brawo, potworze!', 'Koniec! {name} wygrywa, a wy idziecie do domu z niczym.'],
  },
  c: {
    start: ['Zaczynamy. Nie wszyscy wyjdą z tej gry z honorem. Właściwie nikt.', 'Witam. Dzisiejszą grę sponsoruje nieuchronność śmierci.', 'Gramy. Pamiętajcie, że punkty, tak jak życie, są ulotne.', 'Start. Niech wygra najgorszy z was.'],
    question: ['Kolejne pytanie. Odpowiadajcie szybko, czas ucieka. Wasz też.', 'Pytanie. Wasze sumienie i tak już nie żyje.', 'Czytam. Ktoś tu dziś straci resztki niewinności.', 'Pytanie z serii: lepiej, żeby mama nie słyszała.'],
    reveal: ['Odkrywamy. Wasze odpowiedzi zostaną zapamiętane. Na zawsze.', 'Czas na odpowiedzi. Gdzieś właśnie płacze anioł.', 'Czytam. Niech was Bóg ma w opiece. Albo nie.', 'Odpowiedzi. Ta gra nie ma szczęśliwego zakończenia.'],
    judge: ['{judge}, wybierz. Pozostali umrą z goryczy.', '{judge}, jedna odpowiedź przeżyje. Reszta trafi w zapomnienie.', '{judge}, decydujesz o ich losie. Okrutny świat.', '{judge}, wybieraj ostrożnie. Oni zapamiętają.'],
    winner: ['{name} wygrywa. Ofiary tej rundy zostaną upamiętnione.', 'Punkt dla {nameG}. Przegranym składam kondolencje.', '{name} triumfuje. Na zgliszczach rywali.', 'Brawo, {name}. Twoja dusza jest już stracona, ale punkt masz.'],
    slow: ['{name}, czas płynie. Twój również.', '{name}, każda sekunda przybliża nas wszystkich do końca.', '{name}, nawet ślimak w tym czasie coś osiągnął.', '{name}, kiedyś wszyscy umrzemy. Wolałbym, żeby nie w tej rundzie.'],
    end: ['Koniec gry. {name} wygrywa. Pozostałych pochowamy z honorami.', '{name} zwycięża. Historia zapomni przegranych. Już zapomniała.', 'Gra skończona. {name} triumfuje nad zgliszczami.', '{name} wygrywa. Wszystko przemija, ale ten wstyd zostanie.'],
  },
};

const EN = {
  w: {
    start: ['Good evening. I’m actually just the janitor, but the host didn’t show up. So, let’s play.', 'They told me to host. I put the mop down. Let’s begin.'],
    question: ['Question. Found it behind the radiator.', 'Next card. It’s a bit sticky, someone ate a donut here.'],
    reveal: ['Alright, reading. I’m just the messenger.', 'Your answers. I’ll be sweeping all this up later anyway.'],
    judge: ['{judge}, pick something. I still have a hallway to mop.', '{judge}, I’d pick the second one. But I just clean here.'],
    winner: ['Bravo, {name}! You get a clean floor under your chair.', '{name} wins. I’d give you a candy, but I only have window cleaner.'],
    slow: ['{name}, I don’t want to be here either, but pick something.', '{name}, I mopped half the floor in the meantime.'],
    end: ['Game over. {name} wins. Now lift your feet, I’m mopping.', '{name} wins! That was nice. Don’t tell my boss.'],
  },
  a: {
    start: ['Welcome to the show! Tonight’s prize is a used vacuum cleaner and some guilt.', 'Let’s play! The rules are simple. I am not.'],
    question: ['My hamster picked this question. He regrets nothing.', 'This question came to me in a dream about cabbage.'],
    reveal: ['Revealing the cards! Please hold on to something stable.', 'Answers time. Drum roll, please! We don’t have a drum.'],
    judge: ['{judge}, pick a winner. Or flip a coin, that’s what I do.', '{judge}, choose with your heart. Or your liver.'],
    winner: ['Bravo, {name}! Your prize is an imaginary cauliflower.', '{name}! How? Why? Never mind, point!'],
    slow: ['{name}, we’re waiting! My hamster got married in the meantime.', '{name}, the card won’t pick itself. I checked.'],
    end: ['Game over! {name} wins a lifetime supply of nothing!', '{name} wins! Cue the doves. I have no doves.'],
  },
  s: {
    start: ['Let’s begin. Please don’t expect too much of yourselves.', 'Best answers win. So, probably nobody tonight.'],
    question: ['Next question. Try thinking this time.', 'A simple question. I’m sure you’ll ruin it.'],
    reveal: ['Let’s see what you came up with. Keep expectations low.', 'Your masterpieces. No Nobel Prize danger here.'],
    judge: ['{judge}, pick the least embarrassing one.', '{judge}, take your time. We have our whole lives.'],
    winner: ['Congrats, {name}. Against this competition it wasn’t hard.', '{name} wins. Remarkable. For this group.'],
    slow: ['{name}, take your time. Nobody here has a life.', '{name} is thinking. A rare event, let’s not disturb.'],
    end: ['{name} wins. Congratulations on being the least bad.', '{name} is champion. The bar was on the floor, but still.'],
  },
  b: {
    start: ['Hello, losers! One of you will win tonight. Don’t get used to it.', 'Phones out, shame away. Let’s play!'],
    question: ['Question. And no polite answers, please.', 'Give me the worst thing in your hand.'],
    reveal: ['Let’s see who has the most twisted mind.', 'Revealing. You can be ashamed later.'],
    judge: ['{judge}, choose, and don’t be a wimp.', '{judge}, everyone’s watching. No pressure. Some pressure.'],
    winner: ['{name} wins! The rest of you, shame!', 'Bravo, {name}, you twisted human being.'],
    slow: ['{name}, move it! Old age is catching up.', 'Come on, {name}, before I fall asleep.'],
    end: ['{name} wins! Losers do the dishes!', 'Game over! {name} wins and you go home with nothing.'],
  },
  c: {
    start: ['Let’s begin. Not everyone will leave this game with honour. Actually, no one.', 'Tonight’s game is sponsored by the inevitability of death.'],
    question: ['Next question. Answer fast, time is running out. Yours too.', 'Someone here will lose their last bit of innocence.'],
    reveal: ['Revealing. Your answers will be remembered. Forever.', 'Somewhere, an angel is crying.'],
    judge: ['{judge}, choose. The others will die of bitterness.', '{judge}, one answer survives. The rest are forgotten.'],
    winner: ['{name} wins. The victims of this round will be remembered.', 'Bravo, {name}. Your soul is lost, but you got a point.'],
    slow: ['{name}, time flows. Yours too.', '{name}, someday we all die. Preferably not this round.'],
    end: ['{name} wins. The others will be buried with honours.', '{name} wins. History forgets the losers. It already has.'],
  },
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const recent = [];

// Zwraca { text, mood, emo } albo null (gdy prowadzący milczy).
export function quip(host, ev, lang, vars) {
  if (!host || host === 'off') return null;
  const bank = lang === 'pl' ? PL : lang === 'en' ? EN : null;
  if (!bank) return null;
  const pers = host === 'mix' ? pick(['w', 'w', 'a', 's', 'b', 'c']) : host;
  const lines = (bank[pers] && bank[pers][ev]) || [];
  const fresh = lines.filter((l) => recent.indexOf(l) < 0);
  const line = pick(fresh.length ? fresh : lines);
  if (!line) return null;
  recent.push(line); if (recent.length > 20) recent.shift();
  const text = line.replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k]) || '');
  return { text, mood: 'h' + pers, emo: EMO[pers][ev] || 'happy', ev };
}
