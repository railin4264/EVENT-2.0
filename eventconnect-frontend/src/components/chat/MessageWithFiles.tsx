'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Play, Pause, Volume2, FileText, ExternalLink } from 'lucide-react'
import * as chatAPI from '@/lib/api/chat'

interface MessageWithFilesProps {
  message: chatAPI.Message
  isOwn: boolean
  showSender?: boolean
  onReaction?: (emoji: string) => void
  onReply?: () => void
}

export default function MessageWithFiles({
  message,
  isOwn,
  showSender = false,
  onReaction,
  onReply
}: MessageWithFilesProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [audioStates, setAudioStates] = useState<{ [key: string]: { playing: boolean; currentTime: number; duration: number } }>({})

  const { media } = message
  const images = media?.images || []
  const files = media?.files || []

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index)
  }

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('Error downloading file:', error)
    }
  }

  const handleAudioPlay = (url: string) => {
    const audio = new Audio(url)
    
    audio.addEventListener('loadedmetadata', () => {
      setAudioStates(prev => ({
        ...prev,
        [url]: { playing: true, currentTime: 0, duration: audio.duration }
      }))
    })
    
    audio.addEventListener('timeupdate', () => {
      setAudioStates(prev => ({
        ...prev,
        [url]: { ...prev[url], currentTime: audio.currentTime }
      }))
    })
    
    audio.addEventListener('ended', () => {
      setAudioStates(prev => ({
        ...prev,
        [url]: { ...prev[url], playing: false, currentTime: 0 }
      }))
    })
    
    audio.play()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
        {/* Sender info */}
        {showSender && !isOwn && (
          <div className="text-xs text-gray-500 mb-1 ml-1">
            {message.sender.firstName} {message.sender.lastName}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`rounded-2xl p-3 ${
            isOwn
              ? 'bg-primary-500 text-white ml-auto'
              : 'bg-white border border-gray-200 text-gray-900'
          }`}
        >
          {/* Images Grid */}
          {images.length > 0 && (
            <div className={`grid gap-2 mb-3 ${
              images.length === 1 ? 'grid-cols-1' :
              images.length === 2 ? 'grid-cols-2' :
              'grid-cols-2'
            }`}>
              {images.map((image, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
                  onClick={() => handleImageClick(index)}
                >
                  <img
                    src={image.url}
                    alt={image.originalName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                    <ExternalLink className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Files List */}
          {files.length > 0 && (
            <div className="space-y-2 mb-3">
              {files.map((file, index) => {
                const isAudio = chatAPI.isAudioFile(file.fileType)
                const isVideo = chatAPI.isVideoFile(file.fileType)
                const audioState = audioStates[file.url]

                return (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      isOwn ? 'bg-white bg-opacity-20' : 'bg-gray-50'
                    }`}
                  >
                    <div className={`flex-shrink-0 ${isOwn ? 'text-white' : 'text-gray-500'}`}>
                      {isAudio ? (
                        <button
                          onClick={() => handleAudioPlay(file.url)}
                          className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition-colors"
                        >
                          {audioState?.playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </button>
                      ) : (
                        <div className="text-2xl">
                          {chatAPI.getFileIcon(file.fileType)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className={`font-medium truncate ${isOwn ? 'text-white' : 'text-gray-900'}`}>
                        {file.fileName}
                      </div>
                      <div className={`text-sm ${isOwn ? 'text-white text-opacity-80' : 'text-gray-500'}`}>
                        {chatAPI.formatFileSize(file.size)}
                        {isAudio && audioState && (
                          <span className="ml-2">
                            {formatTime(audioState.currentTime)} / {formatTime(audioState.duration)}
                          </span>
                        )}
                      </div>
                      
                      {/* Audio progress bar */}
                      {isAudio && audioState && (
                        <div className="mt-1 w-full bg-white bg-opacity-20 rounded-full h-1">
                          <div
                            className="bg-white h-1 rounded-full transition-all duration-100"
                            style={{
                              width: `${(audioState.currentTime / audioState.duration) * 100}%`
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDownload(file.url, file.fileName)}
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        isOwn
                          ? 'hover:bg-white hover:bg-opacity-20'
                          : 'hover:bg-gray-200'
                      }`}
                    >
                      <Download className={`w-4 h-4 ${isOwn ? 'text-white' : 'text-gray-500'}`} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Text content */}
          {message.content && (
            <div className="whitespace-pre-wrap">
              {message.content}
            </div>
          )}

          {/* Message info */}
          <div className={`flex items-center justify-between mt-2 text-xs ${
            isOwn ? 'text-white text-opacity-70' : 'text-gray-500'
          }`}>
            <span>
              {new Date(message.createdAt).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            
            {/* Reactions */}
            {message.reactions.length > 0 && (
              <div className="flex items-center gap-1">
                {message.reactions.map((reaction, index) => (
                  <span key={index} className="text-sm">
                    {reaction.emoji}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick reactions */}
        {onReaction && (
          <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {['👍', '❤️', '😂', '😮', '😢', '😡'].map(emoji => (
              <button
                key={emoji}
                onClick={() => onReaction(emoji)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-sm"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Image lightbox */}
      {selectedImageIndex !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={() => setSelectedImageIndex(null)}
        >
          <div className="relative max-w-4xl max-h-4xl">
            <img
              src={images[selectedImageIndex].url}
              alt={images[selectedImageIndex].originalName}
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setSelectedImageIndex(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-70 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}