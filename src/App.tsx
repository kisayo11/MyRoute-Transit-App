import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import SearchRoute from './components/SearchRoute'
import LiveRoute from './components/LiveRoute'
import EditRoute from './components/EditRoute'

function App() {
  const [session, setSession] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [view, setView] = useState<'home' | 'search' | 'live' | 'edit'>('home')
  const [currentLiveRoute, setCurrentLiveRoute] = useState<unknown>(null)
  const [editingRoute, setEditingRoute] = useState<unknown>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!error) setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background dark:bg-background-dark">
        <div className="animate-spin w-8 h-8 rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="relative min-h-[100dvh] bg-background dark:bg-background-dark text-text-main dark:text-text-main-dark transition-colors duration-300">
      
      {/* 로그인 모달 */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#16171d] w-full max-w-sm rounded-[2rem] relative shadow-2xl border border-white/10">
            <button 
              onClick={() => setShowAuthModal(false)} 
              className="absolute top-5 right-5 p-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full z-10 text-xs font-bold transition-colors"
            >
              닫기
            </button>
            <Auth onSuccess={() => setShowAuthModal(false)} />
          </div>
        </div>
      )}

      {/* 뷰 이동 */}
      {view === 'live' && currentLiveRoute ? (
        <LiveRoute
          route={currentLiveRoute}
          onBack={() => setView('home')}
        />
      ) : view === 'search' ? (
        <SearchRoute 
          session={session} 
          onBack={() => setView('home')} 
          onRequestAuth={() => setShowAuthModal(true)} 
        />
      ) : view === 'edit' && editingRoute ? (
        <EditRoute
          route={editingRoute}
          onBack={() => setView('home')}
          onSuccess={() => setView('home')}
        />
      ) : (
        <Dashboard 
          session={session} 
          onGoSearch={() => setView('search')} 
          onGoLive={(route) => { setCurrentLiveRoute(route); setView('live'); }}
          onEdit={(route) => { setEditingRoute(route); setView('edit'); }}
          onRequestAuth={() => setShowAuthModal(true)} 
        />
      )}
    </div>
  )
}

export default App
