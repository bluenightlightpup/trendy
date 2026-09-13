import Foundation
import Observation

/// Observable Home feed state — offline-first mock loads with a brief delay.
@Observable
@MainActor
final class HomeViewModel {
    enum LoadState: Equatable {
        case loading
        case loaded([Trend])
        case empty
    }

    private let service: any TrendServing
    private(set) var state: LoadState = .loading
    private var hasLoadedOnce = false

    init(service: any TrendServing = MockTrendService()) {
        self.service = service
    }

    /// Loads mock trends. Full-screen loading only on the first fetch; refresh keeps current content.
    func load(simulateDelay: Bool = true) async {
        if !hasLoadedOnce {
            state = .loading
        }
        if simulateDelay {
            try? await Task.sleep(for: .milliseconds(350))
        }
        let trends = service.trendsSortedByMomentum()
        state = trends.isEmpty ? .empty : .loaded(trends)
        hasLoadedOnce = true
    }
}
