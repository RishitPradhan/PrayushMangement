'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Note } from '@/types'
import { Avatar } from '@/components/shared/Avatar'
import { formatDate } from '@/lib/utils'
import { Send } from 'lucide-react'
import { toast } from 'sonner'

interface NotesSectionProps {
  entityId: string
  entityType: 'project' | 'task'
}

export function NotesSection({ entityId, entityType }: NotesSectionProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userId, setUserId] = useState<string>('')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [supabase])

  useEffect(() => {
    async function fetchNotes() {
      const { data, error } = await supabase
        .from('notes')
        .select('*, author:profiles(id, full_name, avatar_url)')
        .eq('entity_id', entityId)
        .eq('entity_type', entityType)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setNotes(data)
      }
      setLoading(false)
    }

    if (entityId) fetchNotes()
  }, [entityId, entityType, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return

    setSubmitting(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('You must be logged in to post notes')
      setSubmitting(false)
      return
    }

    const { data, error } = await supabase
      .from('notes')
      .insert([{
        content: newNote.trim(),
        entity_id: entityId,
        entity_type: entityType,
        author_id: user.id
      }])
      .select('*, author:profiles(id, full_name, avatar_url)')
      .single()

    if (error) {
      toast.error(`Failed to post note: ${error.message}`)
      console.error('Note post error:', error)
    } else if (data) {
      setNotes(prev => [...prev, data])
      setNewNote('')
    }
    setSubmitting(false)
  }

  if (loading) {
    return <div className="animate-pulse flex space-x-4 p-4"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-gray-800 rounded w-3/4"></div></div></div>
  }

  return (
    <div className="flex flex-col h-full bg-[#111115] rounded-xl border border-[rgba(255,255,255,0.05)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.05)] bg-[#0a0a0c]">
        <h3 className="text-[13px] font-semibold text-white flex items-center gap-2">
          <span>💬</span> Team Notes
        </h3>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-[200px] max-h-[400px]">
        {notes.length === 0 ? (
          <p className="text-center text-[#555] text-[12px] py-4">No notes yet. Be the first to add one!</p>
        ) : (
          notes.map(note => (
            <div key={note.id} className="flex gap-3">
              <Avatar name={note.author?.full_name || 'Unknown'} avatarUrl={note.author?.avatar_url} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-[12px] font-semibold text-white">{note.author?.full_name}</span>
                  <span className="text-[10px] text-[#555]">{formatDate(note.created_at)}</span>
                </div>
                <p className="text-[13px] text-gray-300 leading-relaxed whitespace-pre-wrap">{note.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-[rgba(255,255,255,0.05)] bg-[#0a0a0c]">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="flex-1">
            <textarea
              className="w-full bg-[#111115] text-white text-[13px] rounded-lg border border-[rgba(255,255,255,0.1)] p-2.5 focus:border-[#e63946] focus:outline-none focus:ring-1 focus:ring-[#e63946] resize-none"
              rows={1}
              placeholder="Add a note..."
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
            />
          </div>
          <button 
            type="submit" 
            disabled={!newNote.trim() || submitting}
            className="p-2.5 rounded-lg bg-[rgba(230,57,70,0.1)] text-[#e63946] hover:bg-[rgba(230,57,70,0.2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}
