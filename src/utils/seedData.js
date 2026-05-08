/**
 * Run this once to populate Firestore with starter songs.
 * Call seedSongs(db) from your browser console or a setup screen.
 */
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

const STARTER_SONGS = [
  { title:"Way Maker", key:"Ab", bpm:68, tags:["slow"], color:"#6366f1",
    sections:[
      { label:"Verse 1", chords:"Ab    Eb    Fm    Db", lyrics:"You are here, moving in our midst\nI worship You, I worship You\nYou are here, working in this place\nI worship You, I worship You" },
      { label:"Chorus",  chords:"Db    Ab    Eb    Fm", lyrics:"Way Maker, Miracle Worker\nPromise Keeper, Light in the darkness\nMy God, that is who You are" },
      { label:"Bridge",  chords:"Db    Ab    Eb",       lyrics:"Even when I don't see it, You're working\nEven when I don't feel it, You're working\nYou never stop, You never stop working" },
    ]},
  { title:"Goodness of God", key:"B", bpm:68, tags:["slow"], color:"#ec4899",
    sections:[
      { label:"Verse 1", chords:"B    F#    G#m    E", lyrics:"I love You Lord, for Your mercy never fails me\nAll my days I've been held in Your hands" },
      { label:"Chorus",  chords:"E    B    F#    G#m", lyrics:"All my life You have been faithful\nAll my life You have been so, so good\nWith every breath that I am able\nI will sing of the goodness of God" },
    ]},
  { title:"Build My Life", key:"D", bpm:72, tags:["medium"], color:"#f59e0b",
    sections:[
      { label:"Verse",  chords:"D    A    Bm    G", lyrics:"Worthy of every song we could ever sing\nWorthy of all the praise we could ever bring" },
      { label:"Chorus", chords:"G    D    A    Bm", lyrics:"Holy, there is no one like You\nThere is none beside You\nOpen up my eyes in wonder\nAnd show me who You are" },
    ]},
  { title:"What a Beautiful Name", key:"D", bpm:68, tags:["slow"], color:"#10b981",
    sections:[
      { label:"Verse 1", chords:"D    G    D    A", lyrics:"You were the Word at the beginning\nOne with God the Lord Most High" },
      { label:"Chorus",  chords:"G    D    A    Bm", lyrics:"What a beautiful name it is\nWhat a beautiful name it is\nThe name of Jesus Christ my King" },
    ]},
  { title:"This Is Amazing Grace", key:"G", bpm:124, tags:["upbeat"], color:"#0ea5e9",
    sections:[
      { label:"Verse",  chords:"G    D    Em    C", lyrics:"Who breaks the power of sin and darkness\nWhose love is mighty and so much stronger" },
      { label:"Chorus", chords:"C    G    D    Em", lyrics:"This is amazing grace\nThis is unfailing love\nThat You would take my place\nThat You would bear my cross" },
    ]},
  { title:"Living Hope", key:"G", bpm:138, tags:["upbeat","anthem"], color:"#f97316",
    sections:[
      { label:"Verse 1", chords:"G    C    G    D", lyrics:"How great the chasm that lay between us\nHow high the mountain I could not climb" },
      { label:"Chorus",  chords:"C    G    D    Em", lyrics:"Hallelujah, praise the One who set me free\nHallelujah, death has lost its grip on me\nYou have broken every chain\nThere's salvation in Your name\nJesus Christ, my living hope" },
    ]},
  { title:"King of Kings", key:"E", bpm:68, tags:["anthem"], color:"#ef4444",
    sections:[
      { label:"Verse 1", chords:"E    B    C#m    A", lyrics:"In the darkness we were waiting\nWithout hope, without light\nTill from Heaven You came running\nThere was mercy in Your eyes" },
      { label:"Chorus",  chords:"A    E    B    C#m", lyrics:"Praise the Father, praise the Son\nPraise the Spirit, three in one\nGod of glory, Majesty\nPraise forever to the King of kings" },
    ]},
  { title:"Great Are You Lord", key:"D", bpm:67, tags:["slow","anthem"], color:"#84cc16",
    sections:[
      { label:"Verse",  chords:"D    A    Bm    G", lyrics:"You give life, You are love\nYou bring light to the darkness\nYou give hope, You restore\nEvery heart that is broken" },
      { label:"Chorus", chords:"G    D    A    Bm", lyrics:"Great are You Lord\nIt's Your breath in our lungs\nSo we pour out our praise\nWe pour out our praise to You only" },
    ]},
]

export async function seedSongs(db) {
  const col = collection(db, 'songs')
  for (const song of STARTER_SONGS) {
    await addDoc(col, { ...song, fileUrl: null, fileName: null, addedBy: 'seed', createdAt: serverTimestamp() })
  }
  console.log(`✅ Seeded ${STARTER_SONGS.length} songs`)
}
