import React from 'react';
import { Image, View } from 'react-native';
import Pdf from 'react-native-pdf';
import type { OpenDoc } from '../documents';

/**
 * One page, drawn to exactly the frame it is given (the frame already has
 * the page's shape, so the page fills it and placements line up).
 * PDFs through react-native-pdf (PDFKit) in single-page mode with touch
 * off, so the overlay above gets every touch; a photo as an image.
 */
export default function PageView({ doc, page, width, height }: { doc: OpenDoc; page: number; width: number; height: number }) {
  if (doc.kind === 'photo' && doc.photo) {
    return <Image source={{ uri: `data:image/jpeg;base64,${doc.photo.base64}` }} style={{ width, height }} resizeMode="stretch" accessible={false} />;
  }
  return (
    <View style={{ width, height }} pointerEvents="none">
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
        style={{ width, height, backgroundColor: '#FFFFFF' }}
      />
    </View>
  );
}
