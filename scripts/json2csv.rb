
require 'json'
require 'csv'


file = File.open("./geolocation-data.json")

json = ""
file.each {|line|
  json << line
}

rs = JSON.parse(json)

CSV.open("./geolocation-data.csv", "wb") do |csv|
  csv << ["id", "timestamp", "latitude", "longitude", "accuracy", "altitude", "speed", "heading", "activity_type", "activity_confidence", "is_moving"]
  rs.each do |location|
    csv << [
      location["id"],
      location["recorded_at"],
      location["latitude"], 
      location["longitude"],
      location["accuracy"],
      location["altitude"],
      location["speed"],
      location["heading"],
      location["activity_type"],
      location["activity_confidence"],
      location["is_moving"]
    ]
  end
end

