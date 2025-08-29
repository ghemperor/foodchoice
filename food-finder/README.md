# Chọn Quán Ăn

Ứng dụng web tĩnh giúp bạn lọc quán ăn theo quận và thể loại đồ ăn (đồ khô, đồ nước, món Hàn, ...), kèm tìm kiếm và sắp xếp.

## Tính năng
- Lọc theo quận
- Chọn nhiều thể loại cùng lúc (chip)
- Tìm kiếm theo tên/địa chỉ/thể loại
- Sắp xếp theo đề xuất, đánh giá, giá tiền, tên
- Giao diện responsive, đẹp, dễ dùng

## Cấu trúc
```
food-finder/
├─ index.html
├─ assets/
│  ├─ css/styles.css
│  ├─ js/app.js
│  └─ data/restaurants.json
```

## Chạy local
Bạn có thể mở trực tiếp `index.html` bằng trình duyệt, nhưng để fetch JSON không bị chặn, nên chạy một HTTP server:

### Python 3
```bash
cd /workspace/food-finder
python3 -m http.server 8000
```
Mở trình duyệt tới `http://localhost:8000`.

### Node (npx serve)
```bash
cd /workspace/food-finder
npx --yes serve -s . -l 8000
```

## Tùy biến dữ liệu
Chỉnh file `assets/data/restaurants.json` theo cấu trúc:
```json
{
  "id": "q1",
  "name": "Tên quán",
  "district": "Quận X",
  "categories": ["đồ nước", "món hàn"],
  "rating": 4.5,
  "priceLevel": 2,
  "address": "Địa chỉ",
  "phone": "+8490...",
  "mapUrl": "https://..."
}
```

## Giấy phép
MIT