import { useState, useEffect } from 'react'
import './App.css'
import { supabase } from './supabaseClient'
import { Session } from '@supabase/supabase-js'
import Lesson from './components/Lesson'

function App() {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  return (
    <>
      {session ? (
        <div className="container" style={{ padding: '50px 0 100px 0' }}>
          {/*
          <Account key={session.user.id} session={session} />
           */}
        </div>
      ) : (
        <Lesson />
      )}
    </>
  )
}

export default App
