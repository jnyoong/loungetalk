# 라운지톡 — 개발 가이드

> 서울 나이트라이프 플랫폼 | 개발 시작: 2026-05-22

## 기본 규칙
- **항상 한국어**로만 응답
- 코드 수정 완료 시 **Android AAB 빌드까지 자동 실행** 후 완료 안내
- **배포 시마다 iOS buildNumber, Android versionCode 반드시 1씩 증가**
- iOS 배포는 맥북 Xcode 직접 빌드 방식 (clipu와 동일)
- 중요한 결정은 사용자 확인 후 진행

---

## 프로젝트 개요
- **서비스**: 서울 라운지바·클럽·루프탑바 정보 집약 플랫폼
- **사용자**: 소비자(탐색·예약) + 사업주(업장 등록·관리)
- **외국인 지원**: 업장명·소개 영문 필드 별도 제공 (K-culture 관광객 대응)
- **상세 기획**: PRODUCT.md 참고

---

## Firebase 프로젝트 정보
- **프로젝트 이름**: lounge
- **프로젝트 ID**: `lounge-35d0a`
- **콘솔**: https://console.firebase.google.com/project/lounge-35d0a
- **Auth Domain**: `lounge-35d0a.firebaseapp.com`
- **Storage Bucket**: `lounge-35d0a.firebasestorage.app`
- **사용 중인 서비스**: Authentication (이메일/비밀번호), Firestore Database, Storage
- **Firestore 위치**: asia-northeast3 (서울)
- **보안 규칙**: `firestore.rules` 파일 (현재는 테스트 모드)

---

## 기술 스택
- **Frontend**: Expo ~54.0.33 + React Native 0.81.5 + TypeScript
- **Backend**: Firebase v10.14.1 (Firestore + Auth + Storage)
- **Navigation**: React Navigation 7 (Bottom Tabs + Native Stack)
- **UI 테마**: 다크모드 전용 (#0A0A0A 배경, #C9A84C 골드 포인트)
- **Auth 세션 유지**: `@firebase/auth/dist/rn` + AsyncStorage
- **Supabase 미사용**: 무료 계정 슬롯 소진 (clipu + 동네로)

---

## 앱 구동 방식

### 앱 시작 흐름
```
npm start
  └─ cross-env NODE_OPTIONS=--max-old-space-size=4096 expo start
       └─ Metro Bundler (포트 8081)
            └─ .env 파일 로드 → Firebase 키 주입
                 └─ App.tsx 진입
                      └─ AuthProvider (Firebase onAuthStateChanged 구독)
                           ├─ 로그인 안 됨 → AuthNavigator (온보딩/로그인/회원가입)
                           └─ 로그인 됨 → profiles 컬렉션에서 role 확인
                                ├─ role: 'consumer' → ConsumerTabNavigator
                                └─ role: 'venue_owner' → VenueTabNavigator
```

### 인증 흐름
1. 회원가입: Firebase Auth `createUserWithEmailAndPassword` → Firestore `profiles/{uid}` 문서 생성
2. 로그인: Firebase Auth `signInWithEmailAndPassword`
3. 세션 유지: AsyncStorage 기반 persistence → 앱 재실행해도 로그인 유지
4. 역할 분기: `profiles.role` 필드가 `consumer` 또는 `venue_owner`

### 데이터 흐름 (Firestore)
```
업장 목록 조회:
  venues 컬렉션 → where(is_active==true) → where(region) → where(categories) → 정렬

이벤트 조회:
  venue_events 컬렉션 → where(is_published==true) → where(event_date 범위) → 정렬

즐겨찾기:
  favorites/{userId}_{venueId} 문서 → setDoc/deleteDoc으로 토글

예약:
  reservations 컬렉션 → addDoc → 사업주 대시보드에서 updateDoc(status)
```

---

## 폴더 구조
```
라운지톡/
├── App.tsx                    # 진입점 (Provider 구성)
├── app.json                   # Expo 설정 (번들ID: com.loungetalk.app)
├── CLAUDE.md                  # 개발 가이드 (현재 파일)
├── PRODUCT.md                 # 서비스 기획문서
├── firestore.rules            # Firestore 보안 규칙
├── firestore.seed.js          # 샘플 데이터 10개 업장
├── .env                       # Firebase 키 (gitignore 필수)
├── .env.example               # 키 형식 예시
│
├── constants/
│   ├── theme.ts               # 색상·여백·타이포그래피 (다크모드)
│   └── regions.ts             # 지역 11개 + 카테고리 8개 정의
│
├── types/
│   └── index.ts               # 전체 타입 (Venue, VenueEvent, Reservation 등)
│
├── lib/
│   └── firebase.ts            # Firebase 초기화 (auth, db, storage export)
│
├── contexts/
│   └── AuthContext.tsx        # 인증 상태 (user, profile, loading, signOut)
│
├── navigation/
│   ├── RootNavigator.tsx      # 루트: Auth/Consumer/Venue 분기
│   ├── AuthNavigator.tsx      # 온보딩 → 로그인 → 회원가입
│   ├── ConsumerTabNavigator.tsx  # 탭: 홈/이벤트/즐겨찾기/MY
│   └── VenueTabNavigator.tsx  # 탭: 대시보드/업장정보/이벤트/설정
│
├── components/
│   └── VenueCard.tsx          # 업장 카드 (목록에서 사용)
│
├── screens/
│   ├── auth/
│   │   ├── OnboardingScreen.tsx   # 첫 화면 (시작하기/로그인/사업주 분기)
│   │   ├── LoginScreen.tsx        # 이메일 로그인
│   │   └── SignupScreen.tsx       # 회원가입 (role 파라미터로 소비자/사업주 분기)
│   │
│   ├── consumer/
│   │   ├── HomeScreen.tsx         # 지역·카테고리 필터 + 업장 목록
│   │   ├── EventsScreen.tsx       # 이벤트 피드 (오늘/내일/이번주/이번달)
│   │   ├── EventDetailScreen.tsx  # 이벤트 상세 (라인업·포스터)
│   │   ├── FavoritesScreen.tsx    # 즐겨찾기 목록
│   │   ├── VenueDetailScreen.tsx  # 업장 상세 (정보+이벤트+즐겨찾기+예약)
│   │   ├── ReservationScreen.tsx  # 무보증금 예약
│   │   └── ProfileScreen.tsx      # MY 탭 (설정·로그아웃)
│   │
│   └── venue/
│       ├── VenueDashboardScreen.tsx    # 대기 예약·예정 이벤트 현황
│       ├── VenueProfileEditScreen.tsx  # 업장 정보 등록·수정
│       ├── EventManageScreen.tsx       # 이벤트 등록·관리
│       └── VenueSettingsScreen.tsx     # 사업주 설정·인스타 연동
│
└── supabase/
    └── schema.sql             # (참고용) 초기 Supabase 스키마 — 현재 미사용
```

---

## Firestore 컬렉션 구조

### `profiles/{userId}`
```
id: string (= Firebase Auth uid)
email: string
nickname: string
role: 'consumer' | 'venue_owner'
preferred_regions: string[]
preferred_categories: string[]
created_at: Timestamp
```

### `venues/{venueId}`
```
owner_id: string | null       # 사업주 uid, 없으면 관리자 등록
name: string
name_en: string | null        # 영문명 (외국인용)
slug: string                  # URL용 고유 식별자
region: RegionId              # gangnam | itaewon | hongdae | ...
categories: CategoryId[]      # ['edm', 'hiphop'] 복수 선택
address: string
lat: number | null
lng: number | null
entrance_fee_weekday: number | null
entrance_fee_weekend: number | null
music_genres: string[]        # ['Hip-Hop', 'R&B']
dress_code: string | null
age_restriction: number       # 기본 19
open_days: string[]           # ['금', '토']
open_time: string | null      # '22:00'
close_time: string | null     # '다음날 06:00'
instagram_handle: string | null
instagram_connected: boolean  # Graph API 연동 여부
website_url: string | null
phone: string | null
capacity: number | null
description: string | null
description_en: string | null # 영문 소개
cover_image_url: string | null
images: string[]
is_active: boolean
is_verified: boolean          # 관리자 인증 뱃지
created_at: Timestamp
updated_at: Timestamp
```

### `venue_events/{eventId}`
```
venue_id: string
title: string
title_en: string | null
description: string | null
event_date: string            # 'YYYY-MM-DD'
start_time: string | null     # '23:00'
end_time: string | null
lineup: string[]              # ['DJ A', 'Artist B']
poster_image_url: string | null
entrance_fee: number | null
ticket_url: string | null
is_published: boolean
created_at: Timestamp
```

### `reservations/{reservationId}`
```
venue_id: string
user_id: string
reservation_date: string      # 'YYYY-MM-DD'
party_size: number
contact_name: string
contact_phone: string
special_requests: string | null
status: 'pending' | 'confirmed' | 'cancelled'
created_at: Timestamp
```

### `favorites/{userId}_{venueId}`
```
user_id: string
venue_id: string
created_at: Timestamp
```
*문서 ID를 `{userId}_{venueId}` 복합키로 사용 → 중복 방지, 빠른 존재 확인*

---

## 환경변수 (.env)
```
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyDVEgs7lrzGLJBCUODOuX0JmxIa4TCYpEg
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=lounge-35d0a.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=lounge-35d0a
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=lounge-35d0a.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=885778472477
EXPO_PUBLIC_FIREBASE_APP_ID=1:885778472477:web:cb49b28058adb8d141b0f4
```

---

## 실행 방법
```bash
# 개발 서버 실행 (Windows CMD/터미널)
cd "c:\Users\User\Desktop\Claud Code\라운지톡"
npm start

# NODE_OPTIONS 자동 적용됨 (package.json scripts에 cross-env 설정)
# → Metro 번들러가 4GB 메모리로 실행
# → .env 자동 로드
# → QR 코드 스캔 (Expo Go 앱)
```

---

## 배포 프로세스 (clipu와 동일)

### Android 빌드 (Windows)
```bash
# 1) android/app/build.gradle versionCode 1 증가
# 2) 빌드 실행
export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"
export ANDROID_HOME="/c/Users/User/AppData/Local/Android/Sdk"
cd android && ./gradlew bundleRelease -x lint
```
- AAB 위치: `android/app/build/outputs/bundle/release/app-release.aab`

### iOS 빌드 (맥북 Xcode)
```bash
npx expo prebuild --platform ios --clean  # 플러그인 변경 시
cd ios && pod install && cd ..
```
→ Xcode: `open ios/loungetalk.xcworkspace` → Archive → Distribute

### 버전 업 체크리스트
- [ ] `app.json` ios.buildNumber 증가
- [ ] `android/app/build.gradle` versionCode 증가

---

## 앱 ID 정보
- **iOS Bundle ID**: `com.loungetalk.app`
- **Android Package**: `com.loungetalk.app`
- **Expo Slug**: `loungetalk`
- **앱 이름 (표시)**: `라운지톡`
- **개발자 Apple Team**: `Y9Q88U5QG3` (clipu와 동일)

---

## 현재 개발 현황 (2026-05-23)

### 완료
- [x] 전체 앱 구조 (소비자 + 사업주)
- [x] Firebase 연동 (Auth + Firestore)
- [x] 온보딩·로그인·회원가입 (역할 분리)
- [x] 소비자: 홈 탐색, 이벤트 피드, 업장 상세, 즐겨찾기, 예약
- [x] 사업주: 대시보드, 업장 등록/수정, 이벤트 관리, 예약 관리
- [x] 다크모드 UI (골드 포인트)
- [x] 외국인 대응 (영문 필드)
- [x] TypeScript 오류 없음
- [x] Expo Go로 실행 확인

### 다음 구현 예정
- [ ] Firebase 샘플 데이터 시딩 (Firestore Console에서 업장 추가)
- [ ] Firestore 보안 규칙 적용 (테스트 모드 → firestore.rules)
- [ ] 이미지 업로드 (Firebase Storage 연동)
- [ ] 인스타그램 Graph API 자동 연동 (Meta 앱 심사 필요)
- [ ] 카카오맵 연동 (지도 뷰)
- [ ] 푸시 알림 (이벤트 신규 등록 알림)
- [ ] Android/iOS 빌드 및 스토어 등록
