import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Upload, 
  Play, 
  MessageSquare, 
  Clock, 
  User, 
  Send,
  Plus,
  Video,
  ChevronRight,
  X
} from 'lucide-react';
import { useTenantDb } from '@/hooks/useTenantDb';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { ExerciseVideo } from '@/types';

export default function ExerciseVideoGallery({ patientId }: { patientId: number }) {
  const { exerciseVideos, auditLogs } = useTenantDb();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<ExerciseVideo | null>(null);
  const [commentText, setCommentText] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  const { data: videos } = useQuery({
    queryKey: ['exercise-videos', patientId],
    queryFn: () => exerciseVideos.listByPatient(patientId)
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Convert to base64 for storage in IndexedDB (demo purpose)
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        await exerciseVideos.upload({
          patientId,
          therapistId: 1, // Mock therapist ID
          title: file.name,
          videoData: base64String,
        });
        await auditLogs.log('create', 'exercise_video', undefined, `Uploaded exercise video: ${file.name}`);
        queryClient.invalidateQueries({ queryKey: ['exercise-videos', patientId] });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsUploading(false);
    }
  };

  const handleAddComment = async () => {
    if (!selectedVideo || !commentText || !videoRef.current) return;

    const timestamp = videoRef.current.currentTime;
    await exerciseVideos.addComment(selectedVideo.id!, commentText, timestamp);
    queryClient.invalidateQueries({ queryKey: ['exercise-videos', patientId] });
    setCommentText('');
    
    // Refresh selected video to show new comment
    const updated = await exerciseVideos.findById(selectedVideo.id!);
    setSelectedVideo(updated || null);
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-primary">Exercise Videos</h3>
          <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Upload and review patient movement</p>
        </div>
        <label className="px-6 py-3 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-primary/10 cursor-pointer">
          <Upload size={16} />
          {isUploading ? 'Uploading...' : 'Upload Video'}
          <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
        </label>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos?.map((video, i) => (
          <motion.div 
            key={video.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => setSelectedVideo(video)}
            className="bg-white rounded-[32px] border border-primary/5 shadow-xl shadow-primary/5 overflow-hidden group cursor-pointer"
          >
            <div className="aspect-video bg-primary/5 relative flex items-center justify-center">
              <Video size={48} className="text-primary/10 group-hover:scale-110 transition-transform" />
              <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-primary shadow-2xl">
                  <Play size={20} fill="currentColor" />
                </div>
              </div>
            </div>
            <div className="p-6 space-y-2">
              <h4 className="text-sm font-bold text-primary truncate">{video.title}</h4>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">
                  {format(video.createdAt, 'MMM d, yyyy')}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-accent uppercase tracking-widest">
                  <MessageSquare size={10} />
                  {video.comments.length} Comments
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Video Review Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVideo(null)}
              className="absolute inset-0 bg-primary/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-6xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[80vh]"
            >
              {/* Video Player */}
              <div className="flex-[2] bg-black flex items-center justify-center relative">
                <video 
                  ref={videoRef}
                  src={selectedVideo.videoData}
                  controls
                  className="w-full h-full object-contain"
                />
                <button 
                  onClick={() => setSelectedVideo(null)}
                  className="absolute top-6 left-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Comments Panel */}
              <div className="flex-1 flex flex-col bg-white">
                <div className="p-8 border-b border-primary/5 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-primary">Video Review</h3>
                    <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Timestamped Feedback</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                  {selectedVideo.comments.sort((a, b) => a.timestamp - b.timestamp).map((comment, i) => (
                    <div 
                      key={i} 
                      className="space-y-2 cursor-pointer group"
                      onClick={() => {
                        if (videoRef.current) videoRef.current.currentTime = comment.timestamp;
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="px-2 py-0.5 bg-accent/10 text-accent rounded text-[10px] font-bold font-mono">
                            {Math.floor(comment.timestamp / 60)}:{(Math.floor(comment.timestamp % 60)).toString().padStart(2, '0')}
                          </div>
                          <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">{comment.authorName}</span>
                        </div>
                        <span className="text-[9px] font-bold text-primary/20 uppercase tracking-widest">{format(comment.createdAt, 'HH:mm')}</span>
                      </div>
                      <p className="text-sm text-primary/70 bg-surface-muted/50 p-4 rounded-2xl group-hover:bg-surface-muted transition-colors">
                        {comment.text}
                      </p>
                    </div>
                  ))}
                  {selectedVideo.comments.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                      <MessageSquare size={48} />
                      <p className="text-[10px] font-bold uppercase tracking-widest">No comments yet</p>
                    </div>
                  )}
                </div>

                <div className="p-8 border-t border-primary/5 space-y-4">
                  <div className="relative">
                    <textarea 
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add timestamped comment..."
                      className="w-full pl-6 pr-16 py-4 bg-surface-muted border-none rounded-2xl text-sm focus:ring-2 focus:ring-accent/20 transition-all resize-none"
                      rows={2}
                    />
                    <button 
                      onClick={handleAddComment}
                      disabled={!commentText}
                      className="absolute right-4 bottom-4 p-3 bg-primary text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-30"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
