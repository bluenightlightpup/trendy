import SwiftUI

@main
struct TrendyApp: App {
    @StateObject private var model = AppModel()
    @StateObject private var saved = SavedTrendsStore()
    @StateObject private var prefs = PreferencesStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(model)
                .environmentObject(saved)
                .environmentObject(prefs)
                .preferredColorScheme(.dark)
                .tint(TrendyColors.heatHot)
        }
    }
}
