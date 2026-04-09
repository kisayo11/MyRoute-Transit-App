import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth({ onSuccess }: { onSuccess?: () => void }) {
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const email = `${userId}@myroute.app`

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) alert('로그인 실패: 아이디나 페스워드를 확인해주세요.')
        else if (onSuccess) onSuccess()
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) alert('회원가입 실패: ' + error.message)
        else {
          alert('가입 완료! 자동으로 로그인됩니다.')
          // signUp 성공 시 자동 로그인됨 (세션 변경 이벤트 발생)
          if (onSuccess) onSuccess()
        }
      }
    } catch (error: any) {
      alert(error.error_description || error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full p-8 px-6">
      <h2 className="text-3xl font-bold mb-2 text-center text-primary tracking-tight">
        {isLogin ? '로그인이 필요해요' : '계정을 만들어주세요'}
      </h2>
      <p className="text-sm text-center text-text-sub dark:text-text-sub-dark mb-8">
        즐겨찾기로 저장하면 언제든 빠르게 볼 수 있어요!
      </p>

      <form onSubmit={handleAuth} className="space-y-5">
        <div>
          <label className="block text-[13px] font-semibold mb-1 uppercase tracking-wide">ID</label>
          <input
            type="text"
            className="w-full px-4 py-3 bg-black/5 dark:bg-white/5 border border-border dark:border-border-dark rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all placeholder:text-text-sub/50"
            placeholder="기억하기 쉬운 아이디"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-[13px] font-semibold mb-1 uppercase tracking-wide">Password</label>
          <input
            type="password"
            className="w-full px-4 py-3 bg-black/5 dark:bg-white/5 border border-border dark:border-border-dark rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all"
            placeholder="●●●●●●"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-xl shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
        >
          {loading ? '처리 중...' : (isLogin ? '로그인' : '아이디 생성 및 로그인')}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setIsLogin(!isLogin)}
        className="w-full mt-6 text-sm font-medium text-text-sub dark:text-text-sub-dark hover:text-primary dark:hover:text-primary transition-colors text-center"
      >
        {isLogin ? '처음이시라면 아이디를 만들어보세요' : '이미 아이디가 있다면 로그인'}
      </button>
    </div>
  )
}
