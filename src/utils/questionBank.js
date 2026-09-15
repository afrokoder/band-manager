const KEYS = ['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B']
const MAJOR_SCALES = {
  C:['C','D','E','F','G','A','B'], 'C♯':['C♯','D♯','E♯','F♯','G♯','A♯','B♯'], D:['D','E','F♯','G','A','B','C♯'],
  'E♭':['E♭','F','G','A♭','B♭','C','D'], E:['E','F♯','G♯','A','B','C♯','D♯'], F:['F','G','A','B♭','C','D','E'],
  'F♯':['F♯','G♯','A♯','B','C♯','D♯','E♯'], G:['G','A','B','C','D','E','F♯'], 'A♭':['A♭','B♭','C','D♭','E♭','F','G'],
  A:['A','B','C♯','D','E','F♯','G♯'], 'B♭':['B♭','C','D','E♭','F','G','A'], B:['B','C♯','D♯','E','F♯','G♯','A♯'],
}
const ROMAN = ['I','ii','iii','IV','V','vi','vii°']
const QUALITIES = ['major','minor','minor','major','major','minor','diminished']
const SOLFA = ['Do','Re','Mi','Fa','Sol','La','Ti']
const MUSIC_TEMPLATES = [
  (k,d)=>[`In ${k} major, what is scale degree ${d+1}?`, MAJOR_SCALES[k][d]],
  (k,d)=>[`In ${k} major, which note is ${SOLFA[d]}?`, MAJOR_SCALES[k][d]],
  (k,d)=>[`What chord quality belongs to scale degree ${d+1} (${ROMAN[d]}) in a major key?`, QUALITIES[d]],
  (k,d)=>[`In ${k} major, which Roman numeral represents the chord built on ${MAJOR_SCALES[k][d]}?`, ROMAN[d]],
]
const MUSIC_DISTRACTORS = ['major','minor','diminished','augmented','I','ii','iii','IV','V','vi','vii°',...KEYS,...SOLFA]

const MUSIC_PREFIXES = ['', 'Theory check: ', 'Rehearsal check: ', 'Quick warm-up: ', 'Musician challenge: ', 'Harmony check: ', 'Worship band theory: ', 'Music fundamentals: ', 'Practice-room question: ', 'Skill check: ', 'Bandstand check: ', 'Sunday prep: ', 'Theory warm-up: ', 'Music knowledge: ', 'Harmony warm-up: ', 'Quick theory: ', 'Set-prep question: ', 'Musicianship check: ', 'Band rehearsal: ', 'Worship musicianship: ']
const MUSIC_SUFFIXES = ['', ' Choose the standard answer.', ' Think like you are preparing a set.', ' Use standard major-key theory.', ' Choose the most precise answer.', ' Answer before reaching for an instrument.', ' Apply the theory you would use in rehearsal.', ' Think in scale degrees.', ' Use the conventional music-theory answer.', ' Make the call you would use with the band.', ' Answer as you would during rehearsal.', ' Choose the answer a band leader would expect.', ' Use your ear-training theory knowledge.', ' Think about the keyboard layout.', ' Apply this to a worship arrangement.', ' Choose the musically correct option.', ' Think through the harmony before answering.', ' Use the same theory you would use to transpose.', ' Answer from a practical band perspective.', ' Choose the best rehearsal-ready answer.']
function musicWording(question, seed) {
  const prefix = MUSIC_PREFIXES[seed % MUSIC_PREFIXES.length]
  const suffix = MUSIC_SUFFIXES[Math.floor(seed / MUSIC_PREFIXES.length) % MUSIC_SUFFIXES.length]
  return `${prefix}${question}${suffix}`
}

const BIBLE_FACTS = [
  ['Who wrote many of the Psalms?','David',['Moses','Solomon','Peter']],
  ['Who played the lyre for King Saul?','David',['Samuel','Jonathan','Asaph']],
  ['Which tribe was set apart for temple service?','Levi',['Judah','Benjamin','Dan']],
  ['Who led worship after Israel crossed the Red Sea?','Miriam',['Ruth','Esther','Deborah']],
  ['Who sang hymns in prison with Silas?','Paul',['Peter','John','Barnabas']],
  ['Which king was known for wisdom and wrote many Proverbs?','Solomon',['Saul','Hezekiah','Josiah']],
  ['Psalm 150 repeatedly calls people to do what?','Praise the Lord',['Build an altar','Travel to Jerusalem','Keep silent']],
  ['Psalm 33 says to play in what way?','Skillfully',['Quietly','Only alone','Without instruments']],
  ['Psalm 100 says to enter His courts with what?','Praise',['Questions','Silence','Fear']],
  ['Which book comes immediately after Psalms?','Proverbs',['Isaiah','Job','Ecclesiastes']],
  ['Who appointed singers for temple ministry?','David',['Pilate','Thomas','Lydia']],
  ['Who led Israel through the Red Sea?','Moses',['Joshua','Samuel','Elijah']],
  ['Which Psalm begins with a call to sing a new song to the Lord?','Psalm 96',['Psalm 23','Psalm 51','Psalm 121']],
  ['Who was a chief musician and psalm writer in David’s time?','Asaph',['Nicodemus','Gamaliel','Cornelius']],
  ['In 2 Chronicles 20, praise went before what?','The army',['The builders','The merchants','The farmers']],
  ['Who danced before the Lord when the ark came to Jerusalem?','David',['Saul','Solomon','Nathan']],
  ['Who wrote many songs and proverbs according to 1 Kings?','Solomon',['Samuel','Isaiah','Ezra']],
  ['Who was the prophetess and sister of Moses who led women with tambourines?','Miriam',['Hannah','Ruth','Abigail']],
  ['Which New Testament letter tells believers to sing psalms, hymns, and spiritual songs?','Ephesians',['Romans','Philemon','Jude']],
  ['Which New Testament letter also tells believers to sing psalms, hymns, and spiritual songs?','Colossians',['Galatians','Titus','2 Peter']],
  ['Who sang a song after crossing the Red Sea?','Moses',['Aaron','Caleb','Joshua']],
  ['Who composed a song after God answered her prayer for a son?','Hannah',['Sarah','Rachel','Elizabeth']],
  ['Which Gospel records Jesus and the disciples singing a hymn after the Last Supper?','Matthew',['Luke only','John only','Acts']],
  ['Which Gospel also records Jesus and the disciples singing a hymn after the Last Supper?','Mark',['John','Acts','Romans']],
  ['What instrument is specifically mentioned in Psalm 150 along with trumpet and cymbals?','Harp/Lyre',['Organ only','Saxophone','Guitar amp']],
  ['What kind of cymbals does Psalm 150 mention?','Loud clashing cymbals',['Muted cymbals only','No cymbals','Hand bells only']],
  ['Who is called the sweet psalmist of Israel in 2 Samuel 23?','David',['Solomon','Asaph','Samuel']],
  ['Which book contains the song of Deborah?','Judges',['Joshua','Ruth','Nehemiah']],
  ['Who sang with Barak after victory in Judges 5?','Deborah',['Esther','Naomi','Martha']],
  ['Which prophet included a prayer written like a song in chapter 3?','Habakkuk',['Haggai','Malachi','Obadiah']],
  ['Which book contains “The Lord is my strength and my song”?','Exodus',['Leviticus','Esther','Acts']],
  ['What did Jehoshaphat appoint to go before the army?','Singers',['Archers','Builders','Scribes']],
  ['What were Paul and Silas doing at midnight in prison?','Praying and singing hymns',['Sleeping','Writing letters','Eating']],
  ['Which Psalm is known for “Make a joyful noise unto the Lord”?','Psalm 100',['Psalm 1','Psalm 22','Psalm 119']],
  ['Who said “My heart is steadfast… I will sing and make music”?','David',['Nehemiah','Daniel','Amos']],
  ['Which book includes the Magnificat, Mary’s song of praise?','Luke',['Matthew','Mark','John']],
  ['Who sang the Magnificat?','Mary',['Martha','Elizabeth','Anna']],
  ['Who sang a prophetic song after John the Baptist was born?','Zechariah',['Joseph','Simeon','Nicodemus']],
  ['Which elderly man praised God after seeing Jesus in the temple?','Simeon',['Caiaphas','Gamaliel','Barnabas']],
  ['Who thanked God and spoke about Jesus in the temple as a prophetess?','Anna',['Miriam','Priscilla','Dorcas']],
]

function rotateOptions(correct, distractors, seed) {
  const unique = [correct, ...distractors.filter(item => item !== correct)]
  const choices = []
  for (let i=0; choices.length<4 && i<unique.length*2; i+=1) {
    const candidate = unique[(seed*7 + i*5) % unique.length]
    if (!choices.includes(candidate)) choices.push(candidate)
  }
  if (!choices.includes(correct)) choices[seed % 4] = correct
  const shift = seed % 4
  const rotated = [...choices.slice(shift), ...choices.slice(0,shift)]
  return [rotated, rotated.indexOf(correct)]
}

function musicQuestion(difficulty, seed) {
  const key = KEYS[seed % KEYS.length]
  const degree = Math.floor(seed / KEYS.length) % 7
  const templateIndex = Math.floor(seed / (KEYS.length*7)) % MUSIC_TEMPLATES.length
  const [base, correct] = MUSIC_TEMPLATES[templateIndex](key, degree)
  let question = base
  let distractors = MUSIC_DISTRACTORS

  if (difficulty === 'medium') {
    const bpm = 60 + (seed % 101)
    if (seed % 3 === 0) {
      const beats = 4 + (seed % 13)
      const seconds = Number(((beats * 60) / bpm).toFixed(2))
      question = `At ${bpm} BPM, about how many seconds do ${beats} quarter-note beats last?`
      const opts = [seconds, Number((seconds+.5).toFixed(2)), Number(Math.max(.1,seconds-.5).toFixed(2)), Number((seconds*2).toFixed(2))].map(String)
      return { id:`music-medium-${seed}`, question:musicWording(question,seed), answers:opts, correctIndex:0 }
    }
    if (seed % 3 === 1) {
      const scale = MAJOR_SCALES[key]
      const root = scale[degree]
      const next = scale[(degree+2)%7]
      question = `In ${key} major, which scale tone is a diatonic third above ${root}?`
      const [answers, correctIndex] = rotateOptions(next, scale, seed)
      return { id:`music-medium-${seed}`, question:musicWording(question,seed), answers, correctIndex }
    }
  }

  if (difficulty === 'hard') {
    const semitones = 1 + (seed % 12)
    const intervalNames = {1:'minor 2nd',2:'major 2nd',3:'minor 3rd',4:'major 3rd',5:'perfect 4th',6:'tritone',7:'perfect 5th',8:'minor 6th',9:'major 6th',10:'minor 7th',11:'major 7th',12:'octave'}
    if (seed % 3 === 0) {
      const correctInterval = intervalNames[semitones]
      const all = Object.values(intervalNames)
      const [answers, correctIndex] = rotateOptions(correctInterval, all, seed)
      return { id:`music-hard-${seed}`, question:musicWording(`Which interval contains ${semitones} semitone${semitones===1?'':'s'}?`,seed), answers, correctIndex }
    }
    if (seed % 3 === 1) {
      const degreeNum = degree + 1
      const quality = QUALITIES[degree]
      const [answers, correctIndex] = rotateOptions(quality, ['major','minor','diminished','augmented'], seed)
      return { id:`music-hard-${seed}`, question:musicWording(`In a major key, what is the diatonic triad quality on scale degree ${degreeNum}?`,seed), answers, correctIndex }
    }
  }

  const [answers, correctIndex] = rotateOptions(String(correct), distractors, seed)
  return { id:`music-${difficulty}-${seed}`, question:musicWording(question,seed), answers, correctIndex }
}

const BIBLE_PROMPTS = [
  q=>q,
  q=>`Bible knowledge: ${q}`,
  q=>`For worship-team study: ${q}`,
  q=>`Choose the best answer: ${q}`,
  q=>`Scripture round: ${q}`,
  q=>`Which answer correctly completes this question: ${q}`,
  q=>`Think carefully about this Bible fact: ${q}`,
  q=>`Worship and Scripture: ${q}`,
  q=>`Bible challenge: ${q}`,
  q=>`Ministry knowledge: ${q}`,
  q=>`Quick Bible check: ${q}`,
  q=>`From Scripture, ${q.charAt(0).toLowerCase()+q.slice(1)}`,
  q=>`Select the correct response. ${q}`,
  q=>`AGM Bible game: ${q}`,
  q=>`Bible & worship round: ${q}`,
  q=>`Which option is accurate? ${q}`,
  q=>`Scripture memory challenge: ${q}`,
  q=>`Bible literacy: ${q}`,
  q=>`Faith and worship knowledge: ${q}`,
  q=>`One more Bible question: ${q}`,
  q=>`Choose carefully: ${q}`,
  q=>`Bible quiz: ${q}`,
  q=>`Worship ministry Bible quiz: ${q}`,
  q=>`Test your Scripture knowledge: ${q}`,
  q=>`Which answer matches the biblical record? ${q}`,
]

function bibleQuestion(difficulty, seed) {
  const pools = {
    easy: BIBLE_FACTS.slice(0, 14),
    medium: BIBLE_FACTS.slice(10, 28),
    hard: BIBLE_FACTS.slice(24),
  }
  const facts = pools[difficulty] || BIBLE_FACTS
  const fact = facts[seed % facts.length]
  const prompt = BIBLE_PROMPTS[Math.floor(seed / facts.length) % BIBLE_PROMPTS.length]
  const cycle = Math.floor(seed / (facts.length * BIBLE_PROMPTS.length))
  const context = cycle % 4 === 0 ? '' : cycle % 4 === 1 ? ' Think about the people involved.' : cycle % 4 === 2 ? ' Focus on the book or event.' : ' Choose the most precise answer.'
  const difficultyLead = difficulty === 'easy' ? '' : difficulty === 'medium' ? 'Intermediate: ' : 'Advanced: '
  const question = `${difficultyLead}${prompt(fact[0])}${context}`
  const [answers, correctIndex] = rotateOptions(fact[1], fact[2], seed)
  return { id:`bible-${difficulty}-${seed}`, question, answers, correctIndex }
}

export const QUESTION_COUNT_PER_LEVEL = 1200

export function getQuestion(game, difficulty, seed) {
  const safe = ((Number(seed)||0) % QUESTION_COUNT_PER_LEVEL + QUESTION_COUNT_PER_LEVEL) % QUESTION_COUNT_PER_LEVEL
  return game === 'bible' ? bibleQuestion(difficulty, safe) : musicQuestion(difficulty, safe)
}

export function pickQuestionIds(game, difficulty, seen = [], count = 10) {
  const used = new Set(Array.isArray(seen) ? seen : [])
  const candidates = []
  for (let i=0; i<QUESTION_COUNT_PER_LEVEL; i+=1) if (!used.has(i)) candidates.push(i)
  if (candidates.length < count) {
    used.clear(); candidates.length = 0
    for (let i=0; i<QUESTION_COUNT_PER_LEVEL; i+=1) candidates.push(i)
  }
  const picked = []
  let salt = Date.now() % 2147483647
  while (picked.length < count && candidates.length) {
    salt = (salt * 48271) % 2147483647
    const index = salt % candidates.length
    picked.push(candidates.splice(index,1)[0])
  }
  return picked
}
