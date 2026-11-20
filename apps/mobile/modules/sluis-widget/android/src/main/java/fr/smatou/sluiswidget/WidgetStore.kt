package fr.smatou.sluiswidget

import android.content.Context
import org.json.JSONObject
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

/** Une image du widget, telle que calculée par l'app (src/widget/snapshot.ts). */
data class WidgetFrame(
  val from: String,
  val state: String,
  val caption: String,
  val headline: String,
  val detail: String,
  val label: String,
)

/**
 * Instantané écrit par l'app (SharedPreferences privées) et lu par le widget, qui n'a ni base ni JavaScript.
 * Il ne contient que des dates, des montants et des noms d'abonnements.
 */
object WidgetStore {
  private const val PREFS = "sluis_widget"
  private const val KEY_SNAPSHOT = "snapshot"
  private val ZONE: TimeZone = TimeZone.getTimeZone("Europe/Paris")

  fun save(context: Context, json: String) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_SNAPSHOT, json).apply()
  }

  /** Jour courant (YYYY-MM-DD) dans le fuseau de l'app. */
  fun today(): String {
    val now = Calendar.getInstance(ZONE)
    return String.format(Locale.ROOT, "%04d-%02d-%02d", now.get(Calendar.YEAR), now.get(Calendar.MONTH) + 1, now.get(Calendar.DAY_OF_MONTH))
  }

  /** Prochain minuit (plus une minute) dans le fuseau de l'app, en millisecondes epoch. */
  fun nextMidnightMillis(): Long {
    val next = Calendar.getInstance(ZONE)
    next.add(Calendar.DAY_OF_MONTH, 1)
    next.set(Calendar.HOUR_OF_DAY, 0)
    next.set(Calendar.MINUTE, 1)
    next.set(Calendar.SECOND, 0)
    next.set(Calendar.MILLISECOND, 0)
    return next.timeInMillis
  }

  /** Image applicable au jour donné : la dernière dont le jour de départ est atteint (même règle que frameFor côté JS). */
  fun currentFrame(context: Context, day: String): WidgetFrame? {
    val json = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_SNAPSHOT, null) ?: return null
    val frames = try {
      parse(json)
    } catch (e: Exception) {
      return null
    }
    // Dates ISO : l'ordre lexicographique est l'ordre chronologique.
    return frames.lastOrNull { it.from <= day } ?: frames.firstOrNull()
  }

  private fun parse(json: String): List<WidgetFrame> {
    val root = JSONObject(json)
    if (root.optInt("version") != 1) {
      return emptyList()
    }
    val array = root.getJSONArray("frames")
    return (0 until array.length()).map { i ->
      val f = array.getJSONObject(i)
      WidgetFrame(
        from = f.getString("from"),
        state = f.getString("state"),
        caption = f.optString("caption"),
        headline = f.optString("headline"),
        detail = f.optString("detail"),
        label = f.optString("label"),
      )
    }
  }
}
