'use client'

import { useState, useRef } from 'react'
import { Upload, Video, X, CheckCircle2, ArrowUp, ArrowDown, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useThemeStore } from '@/store/useThemeStore'

interface VideoFile {
  file: File
  previewUrl: string
  order: number
}

interface VideoUploaderProps {
  onVideoSelect: (files: File[]) => void
  maxSizeMB?: number
  acceptedFormats?: string[]
}

export default function VideoUploader({
  onVideoSelect,
  maxSizeMB = 500,
  acceptedFormats = ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime'],
}: VideoUploaderProps) {
  const theme = useThemeStore((state) => state.theme)
  const [videoFiles, setVideoFiles] = useState<VideoFile[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): boolean => {
    setError(null)

    // 파일 형식 검사
    if (!acceptedFormats.includes(file.type)) {
      setError(`지원하지 않는 파일 형식입니다. 지원 형식: ${acceptedFormats.join(', ')}`)
      return false
    }

    // 파일 크기 검사
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxSizeMB) {
      setError(`파일 크기가 너무 큽니다. 최대 ${maxSizeMB}MB까지 업로드 가능합니다.`)
      return false
    }

    return true
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const newFiles: VideoFile[] = []
    
    Array.from(files).forEach((file) => {
      if (validateFile(file)) {
        const previewUrl = URL.createObjectURL(file)
        newFiles.push({
          file,
          previewUrl,
          order: videoFiles.length + newFiles.length + 1,
        })
      }
    })

    if (newFiles.length > 0) {
      const updatedFiles = [...videoFiles, ...newFiles]
      setVideoFiles(updatedFiles)
      onVideoSelect(updatedFiles.map(vf => vf.file))
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    handleFileSelect(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleRemove = (index: number) => {
    const fileToRemove = videoFiles[index]
    URL.revokeObjectURL(fileToRemove.previewUrl)
    
    const updatedFiles = videoFiles.filter((_, i) => i !== index)
    // 순서 재정렬
    const reorderedFiles = updatedFiles.map((vf, i) => ({
      ...vf,
      order: i + 1,
    }))
    
    setVideoFiles(reorderedFiles)
    onVideoSelect(reorderedFiles.map(vf => vf.file))
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    
    const updatedFiles = [...videoFiles]
    const temp = updatedFiles[index]
    updatedFiles[index] = updatedFiles[index - 1]
    updatedFiles[index - 1] = temp
    
    // 순서 재정렬
    const reorderedFiles = updatedFiles.map((vf, i) => ({
      ...vf,
      order: i + 1,
    }))
    
    setVideoFiles(reorderedFiles)
    onVideoSelect(reorderedFiles.map(vf => vf.file))
  }

  const handleMoveDown = (index: number) => {
    if (index === videoFiles.length - 1) return
    
    const updatedFiles = [...videoFiles]
    const temp = updatedFiles[index]
    updatedFiles[index] = updatedFiles[index + 1]
    updatedFiles[index + 1] = temp
    
    // 순서 재정렬
    const reorderedFiles = updatedFiles.map((vf, i) => ({
      ...vf,
      order: i + 1,
    }))
    
    setVideoFiles(reorderedFiles)
    onVideoSelect(reorderedFiles.map(vf => vf.file))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className={`text-lg font-semibold mb-2 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          영상 업로드
        </h3>
        <p className={`text-sm ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          촬영한 영상 파일을 순서대로 업로드해주세요 (최대 {maxSizeMB}MB)
        </p>
      </div>

      {/* 업로드 영역 */}
      <Card
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`border-2 border-dashed transition-colors ${
          theme === 'dark'
            ? 'border-gray-700 hover:border-gray-600 bg-gray-800'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }`}
      >
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
            }`}>
              <Upload className={`w-8 h-8 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`} />
            </div>
            <div className="text-center">
              <p className={`font-medium mb-1 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                영상 파일을 드래그하거나 클릭하여 업로드
              </p>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                MP4, MOV, AVI 형식 지원 (여러 파일 선택 가능)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedFormats.join(',')}
              onChange={handleFileInputChange}
              multiple
              className="hidden"
              id="video-upload"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="mt-4"
            >
              <Video className="w-4 h-4 mr-2" />
              파일 선택 (여러 개 가능)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 업로드된 영상 목록 */}
      {videoFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className={`text-md font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              업로드된 영상 ({videoFiles.length}개)
            </h4>
            <Badge variant="secondary">
              순서대로 재생됩니다
            </Badge>
          </div>

          <div className="space-y-3">
            {videoFiles.map((videoFile, index) => (
              <Card
                key={index}
                className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* 순서 표시 및 조절 */}
                    <div className="flex flex-col items-center gap-2">
                      <Badge
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                          theme === 'dark'
                            ? 'bg-purple-600 text-white'
                            : 'bg-purple-500 text-white'
                        }`}
                      >
                        {videoFile.order}
                      </Badge>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === videoFiles.length - 1}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* 영상 정보 및 미리보기 */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${
                            theme === 'dark' ? 'text-green-400' : 'text-green-600'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              {videoFile.file.name}
                            </p>
                            <p className={`text-sm ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {formatFileSize(videoFile.file.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(index)}
                          className="text-red-500 hover:text-red-600 flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="w-full">
                        <video
                          src={videoFile.previewUrl}
                          controls
                          className="w-full rounded-lg"
                          style={{ maxHeight: '200px' }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className={`p-4 rounded-lg ${
          theme === 'dark'
            ? 'bg-red-900/20 border border-red-700'
            : 'bg-red-50 border border-red-200'
        }`}>
          <p className={`text-sm ${
            theme === 'dark' ? 'text-red-400' : 'text-red-600'
          }`}>
            {error}
          </p>
        </div>
      )}
    </div>
  )
}
