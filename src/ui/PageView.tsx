import React from 'react';
import { Image, View } from 'react-native';
import Pdf from 'react-native-pdf';
import type { OpenDoc } from '../documents';

/**
 * One page. `width` and `height` are the page's size at zoom 1 (they
 * already have the page's shape, so the page fills them and placements
 * line up); it is shown `zoom` times that size.
 *
 * The page is drawn once, `renderZoom` times the zoom-1 size, and scaled
 * down to the zoom with a transform. A zoom change is then only a new
 * transform: react-native-pdf never gets a new size, so PDFKit never lays
 * the page out again a beat after the placements move, and the text is as
 * sharp as the largest zoom. PDFs through react-native-pdf (PDFKit) in
 * single-page mode with touch off, so the overlay above gets every touch;
 * a photo as an image, drawn the same way.
 */
export default function PageView({ doc, page, width, height, zoom = 1, renderZoom = 1 }: { doc: OpenDoc; page: number; width: number; height: number; zoom?: number; renderZoom?: number }) {
  const rw = width * renderZoom;
  const rh = height * renderZoom;
  const s = zoom / renderZoom;
  // React Native scales about the centre; the translate keeps the top left corner at the frame's top left.
  const fixed = {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    width: rw,
    height: rh,
    transform: s === 1 ? undefined : [{ translateX: (-rw * (1 - s)) / 2 }, { translateY: (-rh * (1 - s)) / 2 }, { scale: s }],
  };
  return (
    <View style={{ width: width * zoom, height: height * zoom, overflow: 'hidden' }} pointerEvents="none">
      {doc.kind === 'photo' && doc.photo ? (
        <Image source={{ uri: `data:image/jpeg;base64,${doc.photo.base64}` }} style={fixed} resizeMode="stretch" accessible={false} />
      ) : (
        <View style={fixed}>
          <Pdf
            key={`${doc.id}-${page}`}
            source={{ uri: doc.uri }}
            page={page + 1}
            singlePage
            fitPolicy={2}
            minScale={1}
            maxScale={1}
            scrollEnabled={false}
            enableAntialiasing
            spacing={0}
            style={{ width: rw, height: rh, backgroundColor: '#FFFFFF' }}
          />
        </View>
      )}
    </View>
  );
}
