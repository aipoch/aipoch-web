export const isMobileDevice = (userAgent: string, maxTouchPoints = 0): boolean =>
  /android|iphone|ipad|ipod|mobile|windows phone/i.test(userAgent) ||
  // Desktop-mode iPads can use a Mac user agent while retaining touch input.
  (/macintosh|mac os x/i.test(userAgent) && maxTouchPoints > 1)
