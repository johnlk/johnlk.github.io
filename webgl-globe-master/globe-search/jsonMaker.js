//https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat

//https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat

//will hold the country colors
var countries = {
    
};

//holds the info regarding flight detinations and trips
var flights = new Array(67664);

$.get('https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat', function(data){
    
    var holder = data.split('\n');
    var line;
    var subArray = [];
    
    for(var i = 0; i < holder.length; i++){
        line = holder[i].split(',');
        subArray = new Array(2);
        subArray[0] = line[2];
        subArray[1] = line[4];
        flights[i] = subArray;
    }
    
});


//console.log(countFlights('GKA'));

//returns the number of flights an airport sees
function countFlights(airportAbriviation){
    var sum = 0;
    for(var i = 0; i < flights.length; i++){
        if(flights[i][0] == airportAbriviation){
            sum++;
        }
        if(flights[i][1] == airportAbriviation){
            sum++;
        }
    }
    return sum;
}

//if a country already has been assigned a color return it, else assign a country color
function getColor(country){
    if(countries[country] == undefined){
        countries[country] = Math.floor(Math.random() * 23) + 1;
    }
    return countries[country];
}

//busiest airpot ATL, flights 1826 per day, this will be max

$.get('https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat', function(data) {
    
    var arr = data.split('\n');
    var line;    
    
    setTimeout(function(){
        document.write('[');
        for(var i = 0; i < arr.length-1; i++){
            line = arr[i].split(',');
            document.write(line[6] + ',');
            document.write(line[7] + ',');
            document.write(((countFlights(line[4].substring(1, line[4].length-1))/3652) + 0.001).toFixed(6) + ',');
            document.write(getColor(line[3].substring(1, line[3].length-1)));\
            if(i < arr.length - 2){
                document.write(',');
            }
        }
        document.write(']');
    },10); 
    
    //json file will contain lat, long, magnitude, color
    
});