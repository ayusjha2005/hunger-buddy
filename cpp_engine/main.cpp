#include <iostream>
#include <string>
#include <vector>
#include "json.hpp"

using json = nlohmann::json;
using namespace std;

// --- DATA STRUCTURES ---

// 1. Linked List implementation for Cart
struct CartNode {
    json item;
    CartNode* next;
    CartNode(json i) : item(i), next(nullptr) {}
};

class LinkedList {
public:
    CartNode* head;
    LinkedList() : head(nullptr) {}
    
    
    void append(json item) {
        CartNode* newNode = new CartNode(item);
        if (!head) {
            head = newNode;
            return;
        }
        CartNode* temp = head;
        while (temp->next != nullptr) {
            temp = temp->next;
        }
        temp->next = newNode;
    }

    json toJsonArray() {
        json arr = json::array();
        CartNode* temp = head;
        while (temp != nullptr) {
            arr.push_back(temp->item);
            temp = temp->next;
        }
        return arr;
    }
    
   
    ~LinkedList() {
        CartNode* current = head;
        while(current != nullptr) {
            CartNode* next = current->next;
            delete current;
            current = next;
        }
    }
};

// 2. Queue for Orders
class Queue {                                    
    vector<json> items;
public:
    void enqueue(json order) {
        items.push_back(order);
    }
    int size() {
        return items.size();
    }
    int calculateWaitTime() {
        // Assume every order takes 7 minutes
        return items.size() * 7;
    }
};

// 3. Sorting (Merge Sort for Menu)
void merge(vector<json>& arr, int l, int m, int r, string sortBy) {
    int n1 = m - l + 1;
    int n2 = r - m;
    vector<json> L(n1), R(n2);
    for (int i = 0; i < n1; i++) L[i] = arr[l + i];
    for (int j = 0; j < n2; j++) R[j] = arr[m + 1 + j];
    
    int i = 0, j = 0, k = l;
    while (i < n1 && j < n2) {
        bool condition = false;
        if (sortBy == "price") {
            condition = L[i]["price"] <= R[j]["price"];
        } else {
            condition = L[i]["name"] <= R[j]["name"];
        }

        if (condition) {
            arr[k] = L[i];
            i++;
        } else {
            arr[k] = R[j];
            j++;
        }
        k++;
    }
    while (i < n1) {
        arr[k] = L[i];
        i++; k++;
    }
    while (j < n2) {
        arr[k] = R[j];
        j++; k++;
    }
}

void mergeSort(vector<json>& arr, int l, int r, string sortBy) {
    if (l >= r) return;
    int m = l + (r - l) / 2;
    mergeSort(arr, l, m, sortBy);
    mergeSort(arr, m + 1, r, sortBy);
    merge(arr, l, m, r, sortBy);
}

// 4. Searching (Binary Search for Menu Name)
int binarySearch(const vector<json>& arr, string targetName) {
    int l = 0;
    int r = arr.size() - 1;
    while (l <= r) {
        int m = l + (r - l) / 2;
        string currentName = arr[m]["name"];
        if (currentName == targetName) {
            return m;
        }
        if (currentName < targetName) {
            l = m + 1;
        } else {
            r = m - 1;
        }
    }
    return -1;
}

int main() {
    // Read JSON from standard input
    string inputStr;
    string line;
    while (getline(cin, line)) {
        inputStr += line;
    }

    if (inputStr.empty()) {
        cout << R"({"error": "No input provided"})" << endl;
        return 1;
    }

    try {
        json input = json::parse(inputStr);
        string action = input["action"];

        if (action == "sort") {
            vector<json> menu = input["menu"];
            string sortBy = input["sortBy"]; // "price" or "name"
            if (!menu.empty()) {
                mergeSort(menu, 0, menu.size() - 1, sortBy);
            }
            json response;
            response["result"] = menu;
            cout << response.dump() << endl;

        } else if (action == "search") {
            vector<json> menu = input["menu"];
            string targetName = input["targetName"];
            
            // First sort by name to ensure binary search works
            if (!menu.empty()) {
                mergeSort(menu, 0, menu.size() - 1, "name");
            }

            int index = binarySearch(menu, targetName);
            json response;
            if (index != -1) {
                response["result"] = menu[index];
            } else {
                response["result"] = nullptr;
            }
            cout << response.dump() << endl;

        } else if (action == "add_cart") {
            // Demonstrating Linked List
            json existingCart = input["cart"];
            json newItem = input["newItem"];
            
            LinkedList list;
            for (auto& item : existingCart) {
                list.append(item);
            }
            list.append(newItem);

            json response;
            response["result"] = list.toJsonArray();
            cout << response.dump() << endl;

        } else if (action == "queue_wait") {
            // Demonstrating Queue
            json existingQueue = input["queue_orders"];
            Queue q;
            for (auto& order : existingQueue) {
                q.enqueue(order);
            }
            // enqueue new simulated order
            q.enqueue(json::object({{"new", true}}));

            json response;
            response["wait_time"] = q.calculateWaitTime();
            cout << response.dump() << endl;
        } else {
            cout << R"({"error": "Unknown action"})" << endl;
        }

    } catch (const exception& e) {
        json err;
        err["error"] = string("Exception: ") + e.what();
        cout << err.dump() << endl;
    }

    return 0;
}
