import { httpClient } from '@/services/api/httpClient'

export const uploadsService = {
  upload(file: File) {
    const form = new FormData()
    form.append('file', file)
    return httpClient.post('/uploads', form)
  },
}
