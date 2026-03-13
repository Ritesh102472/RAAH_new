// Placeholder component until user uploads a video
// To use a video, place 'background.mp4' in src/assets/ and uncomment

// import videoBg from '../assets/background.mp4' // Uncomment this

export default function EpicBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
        {/* FALLBACK: High Quality CSS Animation if no video */}
        {/* Replace this div with <video> tag if you have a file */}
        
        <div className="absolute inset-0 bg-slate-900 group">
            {/* Simulated Satellite Map Moving */}
            <div className="absolute inset-[-50%] bg-[url('https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-4.0.3&auto=format&fit=crop&w=2613&q=80')] bg-cover opacity-40 animate-[pan_60s_linear_infinite]" />
            
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0f172a_100%)]" />
        </div>

        {/* <video 
            autoPlay 
            loop 
            muted 
            className="absolute inset-0 w-full h-full object-cover opacity-60"
        >
            <source src={videoBg} type="video/mp4" />
        </video> */}

        {/* Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
    </div>
  )
}