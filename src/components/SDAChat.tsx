'use client'

import { useState } from 'react'

import { SDA_AGENTS, useSDAChat, type SDAAgentType } from '@/hooks/useSDAChat'

export function SDAChat() {
  const [selectedAgent, setSelectedAgent] = useState<SDAAgentType>(
    SDA_AGENTS[0]!
  )
  const [initiativeId, setInitiativeId] = useState<string>('')

  const {
    messages,
    input,
    isLoading,
    error,
    stop,
    handleSubmit,
    handleInputChange,
  } = useSDAChat(selectedAgent.type, initiativeId)

  return (
    <div className="mx-auto flex h-screen max-w-4xl flex-col space-y-4 p-4">
      {/* Header */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">
            SDA Chat - Simplified Agent System
          </h1>
          <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">
            Cockpit Pattern
          </span>
        </div>

        {/* Agent Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Select Agent:
            </label>
            <select
              value={selectedAgent.id}
              onChange={e => {
                const agent = SDA_AGENTS.find(a => a.id === e.target.value)
                if (agent) setSelectedAgent(agent)
              }}
              className="w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              {SDA_AGENTS.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          {/* Initiative ID */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Initiative ID (Optional):
            </label>
            <input
              type="text"
              value={initiativeId}
              onChange={e => setInitiativeId(e.target.value)}
              placeholder="e.g., INIT-2024-001"
              className="w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Current Agent Info */}
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-200 px-2 py-1 text-xs text-blue-800">
              {selectedAgent.type}
            </span>
            <span className="font-medium">{selectedAgent.name}</span>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            {selectedAgent.description}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex flex-1 flex-col rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold">Chat Messages</h2>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              Start a conversation with {selectedAgent.name}...
            </div>
          ) : (
            messages.map(message => (
              <div
                key={message.id}
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'ml-auto bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="mb-1 text-xs opacity-70">
                  {message.role === 'user' ? 'You' : selectedAgent.name}
                </div>
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="size-4 animate-spin rounded-full border-b-2 border-gray-500"></div>
              <span>{selectedAgent.name} is typing...</span>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-4 mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <div className="text-sm text-red-800">
              <strong>Error:</strong> {error.message}
            </div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={handleInputChange}
              placeholder={`Type a message to ${selectedAgent.name}...`}
              rows={2}
              className="flex-1 resize-none rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
            />
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? '...' : 'Send'}
              </button>
              {isLoading && (
                <button
                  type="button"
                  onClick={stop}
                  className="rounded-md bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
                >
                  Stop
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SDAChat
