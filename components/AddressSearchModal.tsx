import React, { useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../constants/theme';

// Daum 우편번호 서비스 HTML
// baseUrl 설정으로 Android에서 외부 스크립트 로딩 허용
const DAUM_POSTCODE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #0C0C0C; }
    #wrap { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="wrap"></div>
  <script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
  <script>
    // ReactNativeWebView 브릿지 안전 래퍼
    function sendToApp(data) {
      try {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(data));
        } else {
          // 브릿지가 아직 준비 안 됐을 때 재시도
          setTimeout(function() { sendToApp(data); }, 100);
        }
      } catch(e) {
        setTimeout(function() { sendToApp(data); }, 100);
      }
    }

    function initPostcode() {
      new daum.Postcode({
        oncomplete: function(data) {
          var fullAddr = '';
          var extraAddr = '';
          if (data.userSelectedType === 'R') {
            fullAddr = data.roadAddress;
            if (data.bname !== '' && /[동|로|가]$/.test(data.bname)) {
              extraAddr += data.bname;
            }
            if (data.buildingName !== '' && data.apartment === 'Y') {
              extraAddr += (extraAddr !== '' ? ', ' + data.buildingName : data.buildingName);
            }
            if (extraAddr !== '') {
              extraAddr = ' (' + extraAddr + ')';
            }
          } else {
            fullAddr = data.jibunAddress;
          }
          var result = {
            postcode: data.zonecode,
            address: fullAddr,
            addressDetail: extraAddr,
            sido: data.sido,
            sigungu: data.sigungu,
            bname: data.bname,
            roadAddress: data.roadAddress,
            jibunAddress: data.jibunAddress,
          };
          sendToApp(result);
        },
        theme: {
          bgColor: '#0C0C0C',
          searchBgColor: '#141414',
          contentBgColor: '#0C0C0C',
          pageBgColor: '#0C0C0C',
          textColor: '#FFFFFF',
          queryTextColor: '#FFFFFF',
          postcodeTextColor: '#7B61FF',
          emphTextColor: '#7B61FF',
          outlineColor: 'rgba(255,255,255,0.08)',
        },
        width: '100%',
        height: '100%',
      }).embed(document.getElementById('wrap'));
    }

    // 스크립트 로드 완료 후 실행
    if (typeof daum !== 'undefined' && daum.Postcode) {
      initPostcode();
    } else {
      document.querySelector('script[src*="postcode"]').addEventListener('load', initPostcode);
    }
  </script>
</body>
</html>
`;

export interface AddressResult {
  postcode: string;
  address: string;
  addressDetail: string;
  sido: string;
  sigungu: string;
  roadAddress: string;
  jibunAddress: string;
}

interface Props {
  visible: boolean;
  onSelect: (result: AddressResult) => void;
  onClose: () => void;
}

export default function AddressSearchModal({ visible, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);

  function handleMessage(event: any) {
    try {
      const data: AddressResult = JSON.parse(event.nativeEvent.data);
      onSelect(data);
      onClose();
    } catch {}
  }

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle} allowFontScaling={false}>주소 검색</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* WebView — baseUrl로 Android 크로스오리진 허용 */}
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{
            html: DAUM_POSTCODE_HTML,
            baseUrl: 'https://t1.daumcdn.net',
          }}
          onMessage={handleMessage}
          style={styles.webview}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator color={Colors.accent} size="large" />
              <Text style={styles.loadingText} allowFontScaling={false}>
                주소 검색 로딩 중...
              </Text>
            </View>
          )}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          allowFileAccess
          allowUniversalAccessFromFileURLs
          allowFileAccessFromFileURLs
          onError={(e) => console.log('[AddressModal] WebView error:', e.nativeEvent)}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  webview: { flex: 1, backgroundColor: Colors.bg },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
});
