import { remoteClient } from '@/api/remoteClient';

export const UploadFile = ({ file }) => remoteClient.uploads.upload(file);
