import WidgetKit
import SwiftUI

struct DailyTipEntry: TimelineEntry {
    let date: Date
    let tip: String
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> DailyTipEntry {
        DailyTipEntry(date: Date(), tip: "Loading tip...")
    }

    func getSnapshot(in context: Context, completion: @escaping (DailyTipEntry) -> ()) {
        fetchDailyTip { tip in
            completion(DailyTipEntry(date: Date(), tip: tip))
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DailyTipEntry>) -> ()) {
        fetchDailyTip { tip in
            let entry = DailyTipEntry(date: Date(), tip: tip)
            let next = Calendar.current.startOfDay(for: Date().addingTimeInterval(86400))
            completion(Timeline(entries: [entry], policy: .after(next)))
        }
    }
}

func fetchDailyTip(completion: @escaping (String) -> Void) {
    let tip = UserDefaults.standard.string(forKey: "dailyTip") ?? "Enjoy your brew!"
    completion(tip)
}

struct WidgetEntryView: View {
    var entry: Provider.Entry

    var body: some View {
        VStack {
            Link("Scan", destination: URL(string: "brewMate://scan")!)
            Text(entry.tip).font(.caption)
        }
        .padding()
    }
}

@main
struct BrewMateWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "BrewMateWidget", provider: Provider()) { entry in
            WidgetEntryView(entry: entry)
        }
        .configurationDisplayName("BrewMate Quick Scan")
        .description("Quick access to scan and daily tips.")
    }
}
