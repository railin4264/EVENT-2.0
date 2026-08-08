'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Users, Plus } from 'lucide-react'
import * as chatAPI from '@/lib/api/chat'
import type { ChatRoom } from '@/types/api.types'
import { useAuthStore } from '@/stores/authStore'

interface User {
  _id: string
  name: string
  username: string
  avatar?: string
  bio?: string
  lastActive?: Date
  isOnline?: boolean
}

interface CreateGroupChatProps {
  isOpen: boolean
  onClose: () => void
  onGroupCreated: (chat: ChatRoom) => void
  onError: (error: string) => void
  availableUsers?: User[]
  isLoadingUsers?: boolean
}

export default function CreateGroupChat({
  isOpen,
  onClose,
  onGroupCreated,
  onError,
  availableUsers = [],
  isLoadingUsers = false
}: CreateGroupChatProps) {
  const { user: currentUser } = useAuthStore()
  const [step, setStep] = useState<'details' | 'participants'>('details')
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [isCreating, setIsCreating] = useState(false)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('details')
      setGroupName('')
      setGroupDescription('')
      setSearchQuery('')
      setSelectedUsers([])
      setIsCreating(false)
    }
  }, [isOpen])

  const filteredUsers = availableUsers.filter(user => {
    if (user._id === currentUser?.id) return false
    if (selectedUsers.some(selected => selected._id === user._id)) return false

    const query = searchQuery.toLowerCase()
    return (
      user.name.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query)
    )
  })

  const handleUserSelect = (user: User) => {
    setSelectedUsers(prev => [...prev, user])
  }

  const handleUserRemove = (userId: string) => {
    setSelectedUsers(prev => prev.filter(user => user._id !== userId))
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) {
      onError('El nombre del grupo y al menos un participante son requeridos')
      return
    }

    setIsCreating(true)
    
    try {
      const groupData: chatAPI.CreateGroupChatData = {
        name: groupName.trim(),
        description: groupDescription.trim() || undefined,
        participantIds: selectedUsers.map(user => user._id)
      }

      const response = await chatAPI.createGroupChat(groupData)
      onGroupCreated(response.data)
      onClose()
    } catch (error: any) {
      onError(error.response?.data?.message || 'Error al crear el grupo')
    } finally {
      setIsCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              Crear Grupo
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6">
            {step === 'details' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del grupo *
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Ingresa el nombre del grupo"
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    maxLength={50}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {groupName.length}/50 caracteres
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="Describe el propósito del grupo"
                    rows={3}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    maxLength={200}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {groupDescription.length}/200 caracteres
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={onClose}
                    className="flex-1 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setStep('participants')}
                    disabled={!groupName.trim()}
                    className="flex-1 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Selected users */}
                {selectedUsers.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Participantes seleccionados ({selectedUsers.length})
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {selectedUsers.map(user => (
                        <div
                          key={user._id}
                          className="flex items-center gap-2 bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm"
                        >
                          <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs">
                            {user.name[0]}
                          </div>
                          <span>{user.name}</span>
                          <button
                            onClick={() => handleUserRemove(user._id)}
                            className="w-4 h-4 flex items-center justify-center text-primary-600 hover:text-primary-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar usuarios..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* User list */}
                <div className="max-h-64 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-8 h-8 mx-auto mb-2" />
                      <p>No se encontraron usuarios</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredUsers.map(user => (
                        <button
                          key={user._id}
                          onClick={() => handleUserSelect(user)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white">
                            {user.name[0]}{user.name.split(' ')[1]?.[0] || user.name[1] || ''}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-medium text-gray-900">
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              @{user.username}
                            </div>
                          </div>
                          <Plus className="w-5 h-5 text-gray-400" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setStep('details')}
                    className="flex-1 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={handleCreateGroup}
                    disabled={selectedUsers.length === 0 || isCreating}
                    className="flex-1 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isCreating && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    {isCreating ? 'Creando...' : 'Crear Grupo'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}