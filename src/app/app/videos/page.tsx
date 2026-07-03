'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import type { CleanerVideo } from '@/lib/supabase'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { Play, Plus, Video } from 'lucide-react'

export default function VideosPage() {
  const { supabase, user, loading } = useSupabase()
  const router = useRouter()
  const [videos, setVideos] = useState<CleanerVideo[]>([])
  const [showForm, setShowForm] = useState(false)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [employeeId, setEmployeeId] = useState('')
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
      employee_id: employeeId || undefined,
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
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Cleaner Videos</h2>
              <p className="text-sm text-muted">YouTube & story integration for cleaner profiles</p>
            </div>
            <Button onClick={() => setShowForm(true)} icon={Plus}>
              Add Video
            </Button>
          </div>

          {showForm && (
            <Card padding="md" className="animate-fade-in">
              <div className="space-y-3">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="YouTube/TikTok URL"
                />
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Video title"
                />
                <div className="flex gap-2">
                  {(['youtube', 'tiktok', 'upload'] as const).map(t => (
                    <Button
                      key={t}
                      onClick={() => setVideoType(t)}
                      variant={videoType === t ? 'primary' : 'secondary'}
                      size="sm"
                    >
                      {t}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button onClick={addVideo}>Save</Button>
                  <Button onClick={() => setShowForm(false)} variant="secondary">Cancel</Button>
                </div>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-4 gap-4">
            {videos.length === 0 ? (
              <div className="col-span-4">
                <EmptyState
                  icon={<Video size={32} />}
                  title="No videos yet"
                  description="Add a video to get started"
                />
              </div>
            ) : (
              videos.map(v => (
                <Card key={v.id} padding="sm" className="p-0 overflow-hidden animate-fade-in">
                  <div className="aspect-video bg-surface flex items-center justify-center">
                    <Play size={28} className="text-muted" />
                  </div>
                  <div className="p-3">
                    <h4 className="text-sm font-semibold truncate text-foreground">{v.title || 'Untitled'}</h4>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted">{v.video_type}</span>
                      <Button
                        onClick={() => togglePublish(v.id, v.is_published)}
                        variant="ghost"
                        size="sm"
                        className={v.is_published ? 'text-accent' : 'text-danger'}
                      >
                        {v.is_published ? 'Live' : 'Hidden'}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
