import SwiftUI

/// Four-tab shell: Home, Decode, Explore, You.
struct RootTabView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem {
                    Label("Home", systemImage: "flame.fill")
                }

            DecodeView()
                .tabItem {
                    Label("Decode", systemImage: "text.bubble.fill")
                }

            ExploreView()
                .tabItem {
                    Label("Explore", systemImage: "globe")
                }

            YouView()
                .tabItem {
                    Label("You", systemImage: "person.crop.circle")
                }
        }
        .tint(TrendyColors.heatHot)
        .toolbarBackground(TrendyColors.inkElevated, for: .tabBar)
        .toolbarBackground(.visible, for: .tabBar)
    }
}

#Preview {
    RootTabView()
}
