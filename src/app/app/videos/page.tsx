'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import type { CleanerVideo } from '@/lib/supabase'
import LoadingSkeleton from '@/components/LoadingSkeleton'

export default function VideosPage() {
  const { supabase, user, loading } = useSupabase()
  const router = useRouter()
  const [videos, setVideos] = useState<CleanerVideo[]>([])
  const [showForm, setShowForm] = useState(false)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [cleanerId, setCleanerId] = useState('')
  const [videoType, setVideoType] = useState<'youtube' | 'tiktok' | 'upload'>('youtube')
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/login'); return }
    load()
  }, [user, loading])

  async function load() {
    if (!supabase) return
    setPageLoading(true)
    const { data } = await supabase
      .from('cleaner_videos')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setVideos(data)
    setPageLoading(false)
  }

  async function addVideo() {
    if (!supabase || !url) return
    await supabase.from('cleaner_videos').insert({
      cleaner_id: cleanerId || undefined,
      title,
      url,
      video_type: videoType,
    })
    setUrl('')
    setTitle('')
    setShowForm(false)
    load()
  }

  async function togglePublish(id: string, current: boolean) {
    if (!supabase) return
    await supabase.from('cleaner_videos').update({ is_published: !current }).eq('id', id)
    load()
  }

  return (
    <div className="p-8">
      {pageLoading ? (
        <div className="space-y-6">
          <LoadingSkeleton type="card" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Cleaner Videos</h2>
          <p className="text-sm text-[#888]">YouTube & story integration for cleaner profiles</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-[#00d28e] text-[#0a0a0a] font-semibold rounded-lg text-sm cursor-pointer">
          + Add Video
        </button>
      </div>

      {showForm && (
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4 mb-4">
          <div className="space-y-3">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="YouTube/TikTok URL"
              className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
            />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Video title"
              className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
            />
            <div className="flex gap-2">
              {(['youtube', 'tiktok', 'upload'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setVideoType(t)}
                  className={`px-3 py-1.5 text-xs rounded-lg border cursor-pointer ${
                    videoType === t ? 'bg-[#00d28e] text-[#0a0a0a] border-[#00d28e]' : 'bg-[#1a1a1a] text-[#888] border-[#2a2a2a]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={addVideo} className="px-4 py-2 bg-[#00d28e] text-[#0a0a0a] text-sm rounded-lg font-semibold cursor-pointer">Save</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-[#1a1a1a] text-[#888] text-sm rounded-lg cursor-pointer">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        {videos.length === 0 ? (
          <div className="col-span-4 text-center py-16 text-[#555]">
            <div className="text-4xl mb-3 opacity-30">🎬</div>
            <p className="text-sm">No videos yet</p>
          </div>
        ) : (
          videos.map(v => (
            <div key={v.id} className="bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden">
              <div className="aspect-video bg-[#0d0d0d] flex items-center justify-center text-3xl">▶️</div>
              <div className="p-3">
                <h4 className="text-sm font-semibold truncate">{v.title || 'Untitled'}</h4>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-[#888]">{v.video_type}</span>
                  <button
                    onClick={() => togglePublish(v.id, v.is_published)}
                    className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer ${
                      v.is_published
                        ? 'bg-[rgba(0,210,142,0.12)] text-[#00d28e]'
                        : 'bg-[rgba(255,80,80,0.12)] text-[#ff5050]'
                    }`}
                  >
                    {v.is_published ? 'Live' : 'Hidden'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      </>
      )}
    </div>
  )
}
