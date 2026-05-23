export type RegionId =
  | 'gangnam'
  | 'cheongdam'
  | 'apgujeong'
  | 'itaewon'
  | 'hongdae'
  | 'euljiro'
  | 'sinsa'
  | 'yeouido'
  | 'seongsu'
  | 'jongno'
  | 'other';

export const REGIONS: { id: RegionId; label: string; labelEn: string; emoji: string }[] = [
  { id: 'gangnam', label: '강남', labelEn: 'Gangnam', emoji: '🌆' },
  { id: 'cheongdam', label: '청담', labelEn: 'Cheongdam', emoji: '💎' },
  { id: 'apgujeong', label: '압구정', labelEn: 'Apgujeong', emoji: '✨' },
  { id: 'itaewon', label: '이태원', labelEn: 'Itaewon', emoji: '🌍' },
  { id: 'hongdae', label: '홍대', labelEn: 'Hongdae', emoji: '🎵' },
  { id: 'euljiro', label: '을지로', labelEn: 'Euljiro', emoji: '🏮' },
  { id: 'sinsa', label: '신사', labelEn: 'Sinsa', emoji: '🌸' },
  { id: 'yeouido', label: '여의도', labelEn: 'Yeouido', emoji: '🏙️' },
  { id: 'seongsu', label: '성수', labelEn: 'Seongsu', emoji: '🎨' },
  { id: 'jongno', label: '종로', labelEn: 'Jongno', emoji: '🏯' },
  { id: 'other', label: '기타', labelEn: 'Other', emoji: '📍' },
];

export type CategoryId =
  | 'edm'
  | 'hiphop'
  | 'lounge'
  | 'rooftop'
  | 'jazz'
  | 'techno'
  | 'latin'
  | 'kpop';

export const CATEGORIES: { id: CategoryId; label: string; labelEn: string; color: string }[] = [
  { id: 'edm', label: 'EDM 클럽', labelEn: 'EDM Club', color: '#8B5CF6' },
  { id: 'hiphop', label: '힙합 클럽', labelEn: 'Hip-Hop Club', color: '#F59E0B' },
  { id: 'lounge', label: '라운지바', labelEn: 'Lounge Bar', color: '#C9A84C' },
  { id: 'rooftop', label: '루프탑바', labelEn: 'Rooftop Bar', color: '#06B6D4' },
  { id: 'jazz', label: '재즈바', labelEn: 'Jazz Bar', color: '#EC4899' },
  { id: 'techno', label: '테크노', labelEn: 'Techno Club', color: '#10B981' },
  { id: 'latin', label: '라틴/레게', labelEn: 'Latin/Reggae', color: '#EF4444' },
  { id: 'kpop', label: 'K-POP', labelEn: 'K-POP Club', color: '#3B82F6' },
];
