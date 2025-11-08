import React, { useRef, useState, useEffect } from 'react'
import { io } from 'socket.io-client'

const SIGNALING = import.meta.env.VITE_SIGNALING_URL || 'http://localhost:10000'

export default function App(){
  const localV = useRef(null)
  const remoteV = useRef(null)
  const pc = useRef(null)
  const socket = useRef(null)
  const [status, setStatus] = useState('idle')
  const [connecting, setConnecting] = useState(false)

  useEffect(()=>{
    socket.current = io(SIGNALING, { transports:['websocket','polling'] })
    socket.current.on('connect', ()=> console.log('connected to signaling'))
    socket.current.on('matched', async ()=>{ await startCall(true) })
    socket.current.on('signal', async (data)=>{
      if(!pc.current) await startCall(false)
      if(data.sdp){
        await pc.current.setRemoteDescription(data.sdp)
        if(data.sdp.type === 'offer'){
          const answer = await pc.current.createAnswer()
          await pc.current.setLocalDescription(answer)
          socket.current.emit('signal', { sdp: pc.current.localDescription })
        }
      } else if(data.candidate){
        try{ await pc.current.addIceCandidate(data.candidate) }catch(e){console.warn(e)}
      }
    })
    socket.current.on('left', ()=> stopCall())
    return ()=>{ try{ socket.current.disconnect() }catch(e){} }
  },[])

  async function startCall(isOffer){
    setConnecting(true)
    pc.current = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
    pc.current.onicecandidate = (e)=>{ if(e.candidate) socket.current.emit('signal', { candidate: e.candidate }) }
    pc.current.ontrack = (e)=>{ remoteV.current.srcObject = e.streams[0] }
    try{
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true })
      localV.current.srcObject = stream
      stream.getTracks().forEach(track => pc.current.addTrack(track, stream))
      if(isOffer){
        const offer = await pc.current.createOffer()
        await pc.current.setLocalDescription(offer)
        socket.current.emit('signal', { sdp: pc.current.localDescription })
      }
      setStatus('incall')
    }catch(err){
      console.error('getUserMedia error', err)
      alert('Camera/mic access required')
      stopCall()
    }finally{ setConnecting(false) }
  }
  function find(){ setStatus('finding'); socket.current.emit('find') }
  function leave(){ socket.current.emit('leave'); stopCall() }
  function stopCall(){
    setStatus('idle')
    if(pc.current){ pc.current.close(); pc.current = null }
    if(localV.current && localV.current.srcObject){ localV.current.srcObject.getTracks().forEach(t=>t.stop()); localV.current.srcObject = null }
    if(remoteV.current) remoteV.current.srcObject = null
  }
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <header className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">AC</div>
            <div>
              <h1 className="text-lg font-semibold">AnonChat</h1>
              <p className="text-xs text-gray-500">Anonymous mobile-first video chats — free</p>
            </div>
          </div>
        </header>
        <main className="bg-white rounded-2xl shadow p-4">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <video ref={localV} autoPlay muted playsInline className="w-full h-40 bg-black rounded" />
              <video ref={remoteV} autoPlay playsInline className="w-full h-40 bg-black rounded" />
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={find} disabled={status==='finding' || status==='incall'} className="flex-1 bg-green-500 text-white py-3 rounded-lg">{status==='finding' ? 'Finding...' : 'Find Partner'}</button>
              <button onClick={leave} disabled={status==='idle'} className="flex-1 bg-red-500 text-white py-3 rounded-lg">Leave</button>
            </div>
          </div>
        </main>
        <footer className="mt-4 text-center text-xs text-gray-500">© {new Date().getFullYear()} AnonChat — Mobile Ready</footer>
      </div>
    </div>
  )
}
