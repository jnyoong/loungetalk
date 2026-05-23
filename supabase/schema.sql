-- ============================================================
-- 라운지톡 Supabase Schema
-- ============================================================

-- 1. 사용자 프로필
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nickname TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'consumer' CHECK (role IN ('consumer', 'venue_owner')),
  preferred_regions TEXT[] DEFAULT '{}',
  preferred_categories TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "프로필 본인만 수정" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "프로필 전체 조회 허용" ON profiles FOR SELECT USING (true);

-- 자동 프로필 생성 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nickname, role)
  VALUES (NEW.id, NEW.email, SPLIT_PART(NEW.email, '@', 1), 'consumer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. 업장 정보
CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  name_en TEXT,
  slug TEXT UNIQUE,
  region TEXT NOT NULL,
  categories TEXT[] DEFAULT '{}',
  address TEXT NOT NULL,
  address_detail TEXT,
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  entrance_fee_weekday INTEGER,
  entrance_fee_weekend INTEGER,
  music_genres TEXT[] DEFAULT '{}',
  dress_code TEXT,
  age_restriction INTEGER DEFAULT 19,
  open_days TEXT[] DEFAULT '{}',
  open_time TEXT,
  close_time TEXT,
  instagram_handle TEXT,
  instagram_connected BOOLEAN DEFAULT FALSE,
  website_url TEXT,
  phone TEXT,
  capacity INTEGER,
  description TEXT,
  description_en TEXT,
  cover_image_url TEXT,
  images TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "업장 전체 조회 허용" ON venues FOR SELECT USING (true);
CREATE POLICY "업장 소유자만 수정" ON venues FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "어드민 전체 관리" ON venues FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'venue_owner')
);

-- 3. 이벤트 / 공연 일정
CREATE TABLE IF NOT EXISTS venue_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_en TEXT,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  lineup TEXT[] DEFAULT '{}',
  poster_image_url TEXT,
  entrance_fee INTEGER,
  ticket_url TEXT,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE venue_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "이벤트 전체 조회 허용" ON venue_events FOR SELECT USING (is_published = TRUE);
CREATE POLICY "업장 소유자만 이벤트 관리" ON venue_events FOR ALL USING (
  EXISTS (SELECT 1 FROM venues WHERE id = venue_id AND owner_id = auth.uid())
);

-- 4. 예약
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reservation_date DATE NOT NULL,
  party_size INTEGER NOT NULL DEFAULT 2,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  special_requests TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "예약자 본인 조회" ON reservations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "예약자 본인 생성" ON reservations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "업장 소유자 예약 조회/수정" ON reservations FOR ALL USING (
  EXISTS (SELECT 1 FROM venues WHERE id = venue_id AND owner_id = auth.uid())
);

-- 5. 즐겨찾기
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, venue_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "즐겨찾기 본인만" ON favorites FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 샘플 데이터 (개발용)
-- ============================================================

INSERT INTO venues (name, name_en, slug, region, categories, address, entrance_fee_weekday, entrance_fee_weekend, music_genres, open_days, open_time, close_time, instagram_handle, description, description_en, is_active, is_verified, age_restriction)
VALUES
  ('클럽 옥타곤', 'Club Octagon', 'octagon', 'gangnam', ARRAY['edm'], '서울 강남구 논현로 645', 20000, 30000, ARRAY['EDM', 'House', 'Tech House'], ARRAY['목', '금', '토', '일'], '22:00', '다음날 07:00', 'octagonseoul', '아시아 최고 수준의 EDM 클럽. DJ Mag 세계 Top 10 선정.', 'Asia''s top-rated EDM club. Ranked in DJ Mag World Top 10.', TRUE, TRUE, 19),
  ('케이크샵', 'Cakeshop', 'cakeshop', 'itaewon', ARRAY['hiphop'], '서울 용산구 이태원로 134 지하 1층', 15000, 20000, ARRAY['Hip-Hop', 'House', 'Trap', 'Bass Music'], ARRAY['금', '토'], '23:00', '다음날 06:00', 'cakeshopseoul', '2018 Best Club Seoul 수상. 힙합·하우스·트랩·베이스뮤직 특화.', 'Winner of Best Club Seoul 2018. Specializes in hip-hop, house, trap and bass music.', TRUE, TRUE, 19),
  ('헨즈 클럽', 'The Henz Club', 'henz-club', 'hongdae', ARRAY['hiphop'], '서울 마포구 와우산로 64 지하 1층', 10000, 15000, ARRAY['Hip-Hop', 'R&B', 'Bass Music'], ARRAY['금', '토'], '22:00', '다음날 05:00', 'thehenzclub', '언더그라운드 힙합 씬의 중심. Henz Clothing 운영. 금연 클럽.', 'The heart of Seoul''s underground hip-hop scene. Smoke-free club.', TRUE, TRUE, 19),
  ('소프 서울', 'Soap Seoul', 'soap-seoul', 'itaewon', ARRAY['techno'], '서울 용산구 이태원로 217 지하 2층', 15000, 20000, ARRAY['House', 'Techno', 'Deep House'], ARRAY['금', '토'], '23:00', '다음날 06:00', 'soapseoul', '이태원 언더그라운드 하우스·테크노 클럽. Soap Records 레이블 보유.', 'Underground house & techno club in Itaewon. Home of Soap Records label.', TRUE, TRUE, 19),
  ('NB2', 'Noise Basement 2', 'nb2', 'hongdae', ARRAY['hiphop', 'edm', 'kpop'], '서울 마포구 와우산로 72', 15000, 20000, ARRAY['Hip-Hop', 'R&B', 'EDM', 'K-POP'], ARRAY['월', '화', '수', '목', '금', '토', '일'], '22:00', '다음날 06:00', 'clubnb_official', '1999년부터 운영된 홍대의 상징적 클럽. 힙합·R&B·EDM·K-POP. YG 운영.', 'Iconic Hongdae club since 1999. Hip-hop, R&B, EDM and K-POP. Operated by YG.', TRUE, TRUE, 19),
  ('파우스트', 'Faust', 'faust', 'itaewon', ARRAY['techno'], '서울 용산구 보광로60길 7, 3층', 15000, 20000, ARRAY['Techno', 'Industrial', 'Dark Techno'], ARRAY['금', '토'], '23:00', NULL, 'faustseoul', '이태원 언더그라운드 테크노 클럽. 어둡고 강렬한 사운드.', 'Underground techno club in Itaewon. Dark and intense sound.', TRUE, TRUE, 19),
  ('클럽 아르떼', 'Club Arte', 'arte', 'gangnam', ARRAY['edm', 'hiphop'], '서울 서초구 강남대로 415 지하 1층', 15000, 20000, ARRAY['EDM', 'Hip-Hop', 'House'], ARRAY['수', '목', '금', '토'], '22:00', '다음날 05:00', 'arte_seoul_official', '강남역 인근 클럽. 2층 룸 구비. 접근성 최고.', 'Club near Gangnam Station. Private rooms available. Best accessibility.', TRUE, TRUE, 19),
  ('루프탑 클라우드', 'Rooftop Cloud', 'rooftop-cloud', 'gangnam', ARRAY['rooftop'], '서울 강남구 테헤란로25길 10, 21층', NULL, NULL, ARRAY['Chill', 'Lounge', 'House'], ARRAY['화', '수', '목', '금', '토', '일'], '18:00', '01:00', NULL, '국내 최초 루프탑바. 강남 야경과 함께하는 칵테일.', 'Korea''s first rooftop bar. Cocktails with Gangnam night view.', TRUE, TRUE, 19),
  ('BOO', 'BOO Seoul', 'boo-seoul', 'euljiro', ARRAY['hiphop', 'kpop'], '서울 중구 을지로3가 95-4 B1', 15000, 15000, ARRAY['Hip-Hop', 'K-POP', 'R&B'], ARRAY['금', '토'], '22:00', '다음날 05:00', NULL, '을지로 힙합·K-POP 클럽. 을지로 나이트라이프의 핵심.', 'Hip-hop & K-POP club in Euljiro. Core of Euljiro nightlife.', TRUE, FALSE, 19),
  ('브라운', 'Brown', 'brown-hongdae', 'hongdae', ARRAY['hiphop'], '서울 마포구 상수동 86-22, 5층', 10000, 15000, ARRAY['Hip-Hop', 'R&B', 'Old School'], ARRAY['목', '금', '토'], '22:00', '다음날 05:00', NULL, '올드스쿨 힙합·R&B 전문. 유명 래퍼들이 자주 찾는 홍대 힙합 성지.', 'Old school hip-hop & R&B specialist. A Hongdae hip-hop mecca frequented by famous rappers.', TRUE, FALSE, 19)
ON CONFLICT (slug) DO NOTHING;
