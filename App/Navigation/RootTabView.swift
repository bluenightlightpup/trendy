import SwiftUI

/// Four-tab shell: Home, Decode, Explore, You.
struct RootTabView: View {
    enum Tab: Hashable { case home, decode, explore, you }

    @State private var selection: Tab = .home

    var body: some View {
        TabView(selection: $selection) {
            HomeView()
                .tabItem { Label("Home", systemImage: "flame.fill") }
                .tag(Tab.home)

            DecodeView()
                .tabItem { Label("Decode", systemImage: "text.bubble.fill") }
                .tag(Tab.decode)

            ExploreView()
                .tabItem { Label("Explore", systemImage: "globe") }
                .tag(Tab.explore)

            YouView()
                .tabItem { Label("You", systemImage: "person.crop.circle") }
                .tag(Tab.you)
        }
        .tint(TrendyColors.heatHot)
        .toolbarBackground(TrendyColors.inkElevated, for: .tabBar)
        .toolbarBackground(.visible, for: .tabBar)
    }
}

#Preview {
    RootTabView()
        .environmentObject(AppModel())
        .environmentObject(SavedTrendsStore())
        .environmentObject(PreferencesStore())
        .preferredColorScheme(.dark)
}
