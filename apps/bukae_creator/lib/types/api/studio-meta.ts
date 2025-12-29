// Studio - Meta API 타입 정의 (제목, 해시태그, 상세설명)

export interface StudioMetaRequest {
  productDescription: string
  script: string
}

export interface StudioTitleResponse {
  title: string
}

export interface StudioHashtagsResponse {
  hashtags: string[]
}

export interface StudioDescriptionResponse {
  description: string
}

