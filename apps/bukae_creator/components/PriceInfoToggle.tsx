'use client'

import { useState } from 'react'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import { useThemeStore } from '@/store/useThemeStore'

export default function PriceInfoToggle() {
  const theme = useThemeStore((state) => state.theme)
  const { showPriceInfo, setShowPriceInfo, selectedProducts } = useVideoCreateStore()
  const [previewOpen, setPreviewOpen] = useState(false)

  return (
    <>
      <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
        <CardHeader>
          <CardTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
            상품 가격 정보 표시
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
              영상에 상품 가격 정보를 표시하시겠습니까?
            </Label>
            <div className="flex gap-2">
              <Button
                variant={showPriceInfo ? 'default' : 'outline'}
                onClick={() => setShowPriceInfo(true)}
              >
                표시
              </Button>
              <Button
                variant={!showPriceInfo ? 'default' : 'outline'}
                onClick={() => setShowPriceInfo(false)}
              >
                숨김
              </Button>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setPreviewOpen(true)}
            className="w-full gap-2"
          >
            <Eye className="h-4 w-4" />
            미리보기
          </Button>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className={`max-w-2xl ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}>
          <DialogHeader>
            <DialogTitle>가격 정보 미리보기</DialogTitle>
            <DialogDescription>
              영상에 표시될 가격 정보를 미리 확인하세요
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedProducts.map((product) => (
              <div
                key={product.id}
                className={`p-4 rounded-lg border ${
                  theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                    {product.name}
                  </span>
                  <span className={`font-bold text-lg ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {product.price.toLocaleString()}원
                  </span>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

