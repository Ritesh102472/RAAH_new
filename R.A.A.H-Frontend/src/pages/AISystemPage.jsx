import React, { useState } from 'react';
import { Cpu, Target, Database, ArrowRight, Image as ImageIcon, Crosshair, AlertTriangle, MapPin, FileText, Wrench } from 'lucide-react';

export default function AISystemPage() {
  const [activeTab, setActiveTab] = useState('pipeline'); // 'pipeline', 'accuracy', 'dataset'

  // The pipeline steps based on your screenshot
  const pipelineSteps = [
    { name: 'Image', icon: <ImageIcon size={24} />, desc: 'Frame Extraction' },
    { name: 'Detection', icon: <Crosshair size={24} />, desc: 'YOLOv8 Inference' },
    { name: 'Severity', icon: <AlertTriangle size={24} />, desc: 'Depth/Size Calc' },
    { name: 'Geo Tag', icon: <MapPin size={24} />, desc: 'GPS Mapping' },
    { name: 'Complaint', icon: <FileText size={24} />, desc: 'API Payload Generation' },
    { name: 'Repair Tracking', icon: <Wrench size={24} />, desc: 'Closed-Loop Verification' },
  ];

  return (
    <div className="flex flex-col h-full space-y-8 relative z-10 w-full pb-8 text-gray-100">
      <div>
        <h2 className="text-3xl font-black text-white flex items-center gap-4 tracking-[0.1em] uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
          <Cpu className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]" size={32} />
          AI Intelligence Core
        </h2>
        <p className="text-cyan-400 font-bold uppercase tracking-[0.2em] text-xs mt-2 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">System architecture, model performance, and inference pipeline</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10 pb-6 mb-2">
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`px-6 py-3 rounded-lg font-bold transition-all uppercase tracking-widest text-xs shadow-sm ${activeTab === 'pipeline'
              ? 'bg-blue-900/40 text-cyan-400 border border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'
            }`}
        >
          Detection Pipeline
        </button>
        <button
          onClick={() => setActiveTab('accuracy')}
          className={`px-6 py-3 rounded-lg font-bold transition-all uppercase tracking-widest text-xs shadow-sm ${activeTab === 'accuracy'
              ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'
            }`}
        >
          Model Accuracy
        </button>
        <button
          onClick={() => setActiveTab('dataset')}
          className={`px-6 py-3 rounded-lg font-bold transition-all uppercase tracking-widest text-xs shadow-sm ${activeTab === 'dataset'
              ? 'bg-amber-900/40 text-amber-400 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'
            }`}
        >
          Dataset Samples
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">

        {/* TAB 1: PIPELINE ANIMATION */}
        {activeTab === 'pipeline' && (
          <div className="hackathon-glass rounded-3xl p-8 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] border border-white/5 relative overflow-hidden">
            <h3 className="text-cyan-400 font-black mb-12 text-center text-sm tracking-[0.3em] uppercase drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">Autonomous Workflow</h3>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 w-full overflow-x-auto pb-6 px-2 custom-scrollbar">
              {pipelineSteps.map((step, index) => (
                <React.Fragment key={step.name}>
                  {/* Pipeline Node */}
                  <div className="flex flex-col items-center flex-shrink-0 w-36 group">
                    <div className="w-24 h-24 rounded-2xl bg-black/60 border border-white/20 flex items-center justify-center text-blue-400 mb-6 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] group-hover:border-cyan-400/80 group-hover:bg-blue-900/20 group-hover:-translate-y-2 transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] group-hover:text-cyan-300">
                      {step.icon}
                    </div>
                    <span className="text-white font-black text-sm text-center tracking-wider uppercase mb-2 group-hover:text-cyan-100 transition-colors">{step.name}</span>
                    <span className="text-gray-400 font-bold text-[10px] text-center px-2 leading-relaxed uppercase tracking-widest">{step.desc}</span>
                  </div>

                  {/* Arrow separator (don't show after the last item) */}
                  {index < pipelineSteps.length - 1 && (
                    <div className="hidden md:flex text-cyan-500/50 animate-pulse">
                      <ArrowRight size={32} className="drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: MODEL ACCURACY */}
        {activeTab === 'accuracy' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="hackathon-glass rounded-3xl p-8 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-[80px] pointer-events-none"></div>

              <h3 className="text-white text-xl font-black mb-8 flex items-center gap-4 uppercase tracking-[0.1em] drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                <Target className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" size={28} /> Current Model Metrics
              </h3>

              <ul className="space-y-6 text-gray-300">
                <li className="flex justify-between items-center border-b border-white/10 pb-4">
                  <span className="text-gray-400 font-bold uppercase tracking-widest text-xs">Mean Average Precision (mAP@50):</span>
                  <span className="text-emerald-400 font-black text-lg drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]">94.2%</span>
                </li>
                <li className="flex justify-between items-center border-b border-white/10 pb-4">
                  <span className="text-gray-400 font-bold uppercase tracking-widest text-xs">Inference Speed (RTX 4090):</span>
                  <span className="text-blue-400 font-black text-lg drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]">12 ms/frame</span>
                </li>
                <li className="flex justify-between items-center border-b border-white/10 pb-4">
                  <span className="text-gray-400 font-bold uppercase tracking-widest text-xs">False Positive Rate:</span>
                  <span className="text-emerald-400 font-black text-lg drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]">&lt; 2.5%</span>
                </li>
                <li className="flex justify-between items-center pt-2">
                  <span className="text-gray-400 font-bold uppercase tracking-widest text-xs">Architecture:</span>
                  <span className="text-purple-400 font-black bg-purple-900/30 px-4 py-2 rounded-lg border border-purple-500/30 text-sm drop-shadow-[0_0_8px_rgba(192,132,252,0.8)] uppercase">YOLOv8-Custom</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 3: DATASET SAMPLES */}
        {activeTab === 'dataset' && (
          <div className="hackathon-glass rounded-3xl p-8 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-600/10 rounded-full blur-[80px] pointer-events-none"></div>

            <h3 className="text-white text-xl font-black mb-8 flex items-center gap-4 uppercase tracking-[0.1em] drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
              <Database className="text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" size={28} /> Training Data Representation
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map(num => (
                <div key={num} className="bg-black/80 aspect-square rounded-2xl border border-white/10 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] flex items-center justify-center relative overflow-hidden group hover:border-amber-500/50 transition-colors duration-500">
                  {/* Fake Image Background */}
                  <div className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>

                  <p className="text-cyan-400 text-[10px] font-mono font-black tracking-widest z-10 bg-black/80 border border-cyan-500/30 px-3 py-1.5 rounded-lg shadow-[0_0_10px_rgba(34,211,238,0.2)]">SAMPLE_0{num}</p>

                  {/* Fake bounding box overlay */}
                  <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border-[3px] border-emerald-400/80 bg-emerald-500/10 opacity-30 group-hover:opacity-100 transition-opacity duration-500 rounded-sm shadow-[0_0_15px_rgba(52,211,153,0.5)] z-0">
                    {/* Confidence Score Label */}
                    <div className="absolute -top-6 -left-[3px] bg-emerald-500/80 text-white text-[8px] font-black px-2 py-0.5 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity delay-100 tracking-wider">
                      Pothole 0.9{9 - num}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}