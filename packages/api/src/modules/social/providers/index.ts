import { SocialPlatform, SocialProvider } from "../types"
import { FacebookProvider } from "./facebook"
import { InstagramProvider } from "./instagram"
import { TwitterProvider } from "./twitter"
import { LinkedinProvider } from "./linkedin"
import { PinterestProvider } from "./pinterest"
import { TiktokProvider } from "./tiktok"
import { TumblrProvider } from "./tumblr"
import { DiscordProvider } from "./discord"
import { GoogleBusinessProvider } from "./googlebusiness"

// Registry of all platform integrations. Each platform is one SocialProvider.
const providers: Record<string, SocialProvider> = {
  facebook: new FacebookProvider(),
  instagram: new InstagramProvider(),
  twitter: new TwitterProvider(),
  linkedin: new LinkedinProvider(),
  pinterest: new PinterestProvider(),
  tiktok: new TiktokProvider(),
  tumblr: new TumblrProvider(),
  discord: new DiscordProvider(),
  google_business: new GoogleBusinessProvider(),
}

export function getProvider(platform: SocialPlatform): SocialProvider {
  const provider = providers[platform]
  if (!provider) {
    throw new Error(`[social] no provider registered for platform "${platform}"`)
  }
  return provider
}

export function supportedPlatforms(): SocialPlatform[] {
  return Object.keys(providers) as SocialPlatform[]
}
