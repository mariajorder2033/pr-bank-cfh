package ch.prbank.banking.nav

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Lock
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import ch.prbank.banking.BankViewModel
import ch.prbank.banking.ui.screens.AccountScreen
import ch.prbank.banking.ui.screens.CardsScreen
import ch.prbank.banking.ui.screens.DashboardScreen
import ch.prbank.banking.ui.screens.TransferScreen

private sealed class Dest(val route: String, val label: String, val icon: ImageVector) {
    data object Home : Dest("home", "Home", Icons.Filled.Home)
    data object Payments : Dest("payments", "Payments", Icons.Filled.Lock)
    data object Cards : Dest("cards", "Cards", Icons.AutoMirrored.Filled.List)
}

private val tabs = listOf(Dest.Home, Dest.Payments, Dest.Cards)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppNav(vm: BankViewModel) {
    val navController = rememberNavController()
    val backStack by navController.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination

    Scaffold(
        topBar = { TopAppBar(title = { Text("Private Banking") }) },
        bottomBar = {
            NavigationBar {
                tabs.forEach { dest ->
                    val selected = currentRoute?.hierarchy?.any { it.route == dest.route } == true
                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            navController.navigate(dest.route) {
                                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(dest.icon, contentDescription = null) },
                        label = { Text(dest.label) },
                    )
                }
            }
        },
    ) { padding ->
        NavHost(navController, startDestination = Dest.Home.route, modifier = Modifier.padding(padding)) {
            composable(Dest.Home.route) {
                DashboardScreen(vm, onOpenAccount = { navController.navigate("account/$it") })
            }
            composable(Dest.Payments.route) { TransferScreen(vm) }
            composable(Dest.Cards.route) { CardsScreen(vm) }
            composable("account/{accountId}") { entry ->
                AccountScreen(vm, accountId = entry.arguments?.getString("accountId").orEmpty())
            }
        }
    }
}
